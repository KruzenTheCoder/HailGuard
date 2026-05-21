// HailGuard Fleet Portal — minimal service worker.
// Provides the fetch handler Chrome requires for installability, plus a
// network-first cache so the shell still loads briefly offline. We never cache
// non-GET requests (auth / mutations) and always prefer the network so admins
// don't see stale, RLS-scoped data.
const CACHE = "hailguard-fleet-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        // Opportunistically cache successful same-origin GETs for offline shell.
        if (fresh && fresh.ok && new URL(request.url).origin === self.location.origin) {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return Response.error();
      }
    })()
  );
});
