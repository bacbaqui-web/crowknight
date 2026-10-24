/* global self, URL, Request, fetch */

const NETWORK_FIRST_DESTINATIONS = new Set(['document', 'script', 'style']);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!NETWORK_FIRST_DESTINATIONS.has(event.request.destination) && !url.pathname.endsWith('/version.json')) return;

  if (event.request.destination === 'script') {
    // Revalidation can still receive an old CDN response at the canonical module URL.
    url.searchParams.set('__source', Date.now().toString(36));
    const request = new Request(url, event.request);
    request.headers.delete('if-none-match');
    request.headers.delete('if-modified-since');
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }
  event.respondWith(fetch(event.request, { cache: 'no-cache' }));
});
