/* global self, URL, fetch */

const NETWORK_FIRST_DESTINATIONS = new Set(['document', 'script', 'style']);

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!NETWORK_FIRST_DESTINATIONS.has(event.request.destination) && !url.pathname.endsWith('/version.json')) return;

  event.respondWith(fetch(event.request, { cache: 'no-cache' }));
});
