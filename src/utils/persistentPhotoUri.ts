import type { ImagePickerAsset } from 'expo-image-picker';

/**
 * Turns a picked image into a URI that survives a page reload.
 *
 * `expo-image-picker`'s own `.uri` is not that on either platform this app
 * runs on:
 *
 *  - **Web**: it is a `blob:` URL — `URL.createObjectURL()` over an in-memory
 *    `File`. That reference dies the moment the page reloads (a sign-out, a
 *    hard refresh), because the browser has nothing left to point it at. This
 *    is a confirmed cause, not a guess — a person's `photo_path` in Turso was
 *    found holding exactly `blob:http://localhost:8082/…`, correctly saved,
 *    permanently unusable.
 *  - **Native**: it is a `file://` path into a cache directory the OS does
 *    not promise to keep between launches.
 *
 * A `data:` URI has neither problem — it carries the image's own bytes, so it
 * means the same thing today, after a reload, and on a different device
 * entirely. That is why `launchImageLibraryAsync` is always called with
 * `base64: true`, and why this function is what turns the result into what
 * actually gets stored.
 *
 * This is the right trade for a small, single, cropped avatar — the whole
 * point is that it is cheap to inline. It is deliberately **not** used for a
 * function's cover photo or gallery, or a receipt: those are bigger and can be
 * several per record, and inlining them would bloat a database row that is
 * otherwise a few hundred bytes. Those still need an upload to Firebase
 * Storage, matching `docs/DATABASE.md`'s `photo_path` design — not done yet,
 * and unaffected by this fix.
 */
export function persistentPhotoUri(asset: ImagePickerAsset): string | undefined {
  if (!asset.base64) return asset.uri; // base64: true was not honoured; fall back rather than fail
  const mime = asset.mimeType ?? 'image/jpeg';
  return `data:${mime};base64,${asset.base64}`;
}

/** Above this, a fetched photo is stored by reference instead of inlined. */
const MAX_INLINE_BYTES = 2 * 1024 * 1024; // 2MB — generous for an avatar, a floor against surprises

/** Encodes bytes as base64 without `Buffer` (not a universal global) or
 * `FileReader` (browser-only — absent even from this project's own React
 * Native test environment, so not safe to assume on-device either). `btoa`
 * plus a manual byte-to-binary-string pass is the one primitive both web and
 * native can be relied on to have. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Fetches a remote photo once and turns it into a `data:` URI, so nothing in
 * our own database depends on that URL staying valid.
 *
 * This exists because of Google's own avatar. Firebase's `user.photoURL` is a
 * `https://lh3.googleusercontent.com/...` URL that Google can rotate or
 * expire — confirmed by finding one sitting in `users.photo_url`, correctly
 * saved, then failing to load after the phone had been closed for a couple of
 * days. `persistentPhotoUri` above solves the same class of problem for a
 * locally *picked* photo; this solves it for a *remote* one — different
 * input, same reason: once it is bytes we hold ourselves, nothing external
 * can take it away.
 *
 * Failure is never allowed to hold up sign-in. A network hiccup, a CORS
 * refusal, anything at all — this falls back to the original URL rather than
 * throwing, and self-heals on the caller's next attempt, since it is called
 * on every sign-in.
 */
export async function fetchAsPersistentUri(url: string): Promise<string> {
  if (url.startsWith('data:')) return url; // already our own bytes — nothing to do
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    const mime = response.headers.get('content-type') ?? 'image/jpeg';
    const blob = await response.blob();
    if (blob.size > MAX_INLINE_BYTES) return url; // unexpectedly large — keep the reference instead
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return `data:${mime};base64,${bytesToBase64(bytes)}`;
  } catch {
    return url;
  }
}
