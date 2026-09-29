import { fetchAsPersistentUri, persistentPhotoUri } from '../persistentPhotoUri';

/**
 * The regression this closes: a person's `photo_path` was found in Turso
 * holding `blob:http://localhost:8082/…` — correctly saved, permanently
 * unusable, because a `blob:` URL only means something to the page that
 * created it. Every test here is about the shape of what gets stored, not
 * about the picker itself.
 */
function asset(over: Partial<{ uri: string; base64: string; mimeType: string }> = {}) {
  return {
    uri: 'blob:http://localhost:8082/should-not-be-used',
    base64: 'ZmFrZS1pbWFnZS1ieXRlcw==',
    mimeType: 'image/jpeg',
    ...over,
  } as Parameters<typeof persistentPhotoUri>[0];
}

describe('persistentPhotoUri', () => {
  it('builds a self-contained data: URI rather than passing the blob: URL through', () => {
    const result = persistentPhotoUri(asset());
    expect(result).toBe('data:image/jpeg;base64,ZmFrZS1pbWFnZS1ieXRlcw==');
    expect(result).not.toMatch(/^blob:/);
  });

  it('carries the asset’s own mime type, not a hard-coded one', () => {
    expect(persistentPhotoUri(asset({ mimeType: 'image/png' }))).toBe(
      'data:image/png;base64,ZmFrZS1pbWFnZS1ieXRlcw==',
    );
  });

  it('falls back to image/jpeg when the picker did not report a mime type', () => {
    expect(persistentPhotoUri(asset({ mimeType: undefined }))).toBe(
      'data:image/jpeg;base64,ZmFrZS1pbWFnZS1ieXRlcw==',
    );
  });

  it('falls back to the original uri if base64 was not honoured, rather than storing "data:image/jpeg;base64,undefined"', () => {
    const result = persistentPhotoUri(asset({ base64: undefined }));
    expect(result).toBe('blob:http://localhost:8082/should-not-be-used');
    expect(result).not.toMatch(/base64,undefined/);
  });
});

describe('fetchAsPersistentUri', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(ok: boolean, body: Uint8Array, contentType = 'image/png') {
    global.fetch = jest.fn().mockResolvedValue({
      ok,
      headers: { get: (name: string) => (name === 'content-type' ? contentType : null) },
      blob: async () => ({
        size: body.length,
        arrayBuffer: async () => body.buffer,
      }),
    }) as unknown as typeof fetch;
  }

  it('converts a fetched image into a self-contained data: URI', async () => {
    mockFetch(true, new Uint8Array([137, 80, 78, 71]));
    const result = await fetchAsPersistentUri('https://lh3.googleusercontent.com/a/abc');
    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(result).not.toMatch(/googleusercontent/);
  });

  it('passes an already-local data: URI straight through, unfetched', async () => {
    global.fetch = jest.fn();
    const input = 'data:image/jpeg;base64,AAAA';
    expect(await fetchAsPersistentUri(input)).toBe(input);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to the original URL when the fetch fails outright', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const url = 'https://lh3.googleusercontent.com/a/abc';
    expect(await fetchAsPersistentUri(url)).toBe(url);
  });

  it('falls back to the original URL on a non-OK response, rather than inlining an error page', async () => {
    mockFetch(false, new Uint8Array());
    const url = 'https://lh3.googleusercontent.com/a/abc';
    expect(await fetchAsPersistentUri(url)).toBe(url);
  });

  it('keeps the reference instead of inlining something unexpectedly large', async () => {
    mockFetch(true, new Uint8Array(3 * 1024 * 1024));
    const url = 'https://lh3.googleusercontent.com/a/abc';
    expect(await fetchAsPersistentUri(url)).toBe(url);
  });
});
