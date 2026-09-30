/**
 * The minimum a service worker needs to be, for two reasons and no more:
 *
 *  - Chrome's install criteria for the "Add to Home Screen" / install prompt
 *    require one to be registered with a fetch handler, on top of the
 *    manifest — without this file, Android would show the manifest's icon and
 *    name but never actually offer the install prompt.
 *  - Caching the app shell (the HTML, the JS bundle, the icons) means the next
 *    launch — including offline — has something to boot from at all, rather
 *    than a blank tab. This is the *shell*, not the data: the app's own
 *    read-only offline cache (src/store/DatasetCache.ts) is what supplies the
 *    records once the shell has booted.
 *
 * Deliberately not a caching strategy library, and deliberately not
 * pre-caching every route: the JS bundle's filename is content-hashed, so the
 * one that matters is whichever `index.html` just pointed at, and that is
 * learned at fetch time — not by listing hashes here that go stale the moment
 * a new version ships.
 */

const CACHE_NAME = 'moi-manager-shell-v1';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only GET is cacheable, and only same-origin: Firebase, Turso and Google's
  // own asset hosts each answer this fetch handler too if left unguarded,
  // which is not this file's job and would just add a slower, redundant hop
  // in front of the network for every one of those requests.
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    // Network first: a stale shell is a last resort, not the default — the
    // app is meant to show today's data, not yesterday's screen.
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/'))),
  );
});
