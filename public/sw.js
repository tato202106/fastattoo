/* Fastattoo — service worker (PWA, SPEC §26–27).
 *
 * Stratégies :
 * - pages (navigation)        : réseau d'abord, puis cache, puis /offline ;
 * - /_next/static, /vendor    : cache d'abord (fichiers versionnés, immuables) ;
 * - /media (images), tuiles   : stale-while-revalidate, cache plafonné ;
 * - /api (GET)                : réseau d'abord, cache en secours hors ligne.
 * Événements `push` / `notificationclick` prêts pour les notifications natives.
 */
const VERSION = "v1";
const STATIC = `ft-static-${VERSION}`;
const PAGES = `ft-pages-${VERSION}`;
const IMAGES = `ft-images-${VERSION}`;
const API = `ft-api-${VERSION}`;
const PRECACHE = ["/", "/offline", "/explorer", "/manifest.webmanifest", "/icons/icon-192.png", "/favicon.svg"];
const LIMITS = { [IMAGES]: 300, [PAGES]: 40, [API]: 60 };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName) {
  const max = LIMITS[cacheName];
  if (!max) return;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") {
        cache.put(request, response.clone()).then(() => trim(cacheName));
      }
      return response;
    })
    .catch(() => cached);
  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return network;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()).then(() => trim(cacheName));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response(JSON.stringify({ error: "Hors ligne" }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") return event.respondWith(networkFirst(request, PAGES, "/offline"));
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/") || url.pathname.startsWith("/icons/")) {
      return event.respondWith(cacheFirst(request, STATIC));
    }
    if (url.pathname.startsWith("/media/")) return event.respondWith(staleWhileRevalidate(request, IMAGES, event));
    if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/uploads")) return event.respondWith(networkFirst(request, API));
    return;
  }

  // Tuiles de carte (fond CARTO par défaut).
  if (url.hostname.endsWith("basemaps.cartocdn.com")) event.respondWith(staleWhileRevalidate(request, IMAGES, event));
});

/* ---------- Notifications push (préparé pour la suite) ---------- */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "Fastattoo" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Fastattoo", {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { href: data.href || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const existing = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        existing.navigate(href);
        return existing.focus();
      }
      return self.clients.openWindow(href);
    }),
  );
});
