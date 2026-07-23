// Service worker pro Tipovacka MS 2026
// CACHE_NAME musi obsahovat verzi, aby noveho deployu hraci dostali novy obsah.
// Pri zmene APP_VERSION v tipovacka.html prepis i CACHE_VERSION zde.

const CACHE_VERSION = "v5.12.75";
const CACHE_NAME = "tipovacka-ms-2026-" + CACHE_VERSION;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()).then(() => {
      // Notify all clients about new version - frontend auto-reloads
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "sw-updated", version: CACHE_VERSION }));
      });
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
  // Network-first: vzdy nacti cerstvy HTML (aby uzivatel nebyl o verzi pozadu),
  // cache jen jako fallback pri offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
  }
});
