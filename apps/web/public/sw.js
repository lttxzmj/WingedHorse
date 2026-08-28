/* global Response */

const CACHE_PREFIX = "wingedhorse-shell-";

function loadManifest() {
  return fetch("/asset-manifest.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("ASSET_MANIFEST_UNAVAILABLE");
      return response.json();
    })
    .then((manifest) => {
      if (
        !manifest ||
        typeof manifest !== "object" ||
        !/^[a-f0-9]{12}$/.test(manifest.version) ||
        !Array.isArray(manifest.assets) ||
        manifest.assets.some((value) => {
          if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//"))
            return true;
          return new URL(value, self.location.origin).origin !== self.location.origin;
        })
      )
        throw new Error("ASSET_MANIFEST_INVALID");
      return manifest;
    });
}

function activeCacheName() {
  return caches.keys().then((keys) => keys.find((key) => key.startsWith(CACHE_PREFIX)) || null);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    loadManifest().then((manifest) => {
      const cacheName = `${CACHE_PREFIX}${manifest.version}`;
      return caches.open(cacheName).then((cache) => cache.addAll(manifest.assets));
    })
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      loadManifest().then((manifest) => {
        const cacheName = `${CACHE_PREFIX}${manifest.version}`;
        return caches
          .keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((key) => key.startsWith(CACHE_PREFIX) && key !== cacheName)
                .map((key) => caches.delete(key))
            )
          );
      }),
      self.clients.claim()
    ])
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          url.pathname.startsWith("/assets/") &&
          response.headers.get("content-type")?.includes("text/html")
        )
          throw new Error("ASSET_RESPONSE_INVALID");
        const copy = response.clone();
        void activeCacheName().then((cacheName) => {
          if (cacheName) return caches.open(cacheName).then((cache) => cache.put(request, copy));
        });
        return response;
      })
      .catch(() =>
        activeCacheName().then((cacheName) => {
          if (!cacheName) return Response.error();
          return caches.open(cacheName).then((cache) =>
            cache
              .match(request, { ignoreVary: true })
              .then(async (cached) => cached || (await cache.match("/", { ignoreVary: true })))
              .then((cached) => cached || Response.error())
          );
        })
      )
  );
});
