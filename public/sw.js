// Service Worker - 商场考勤管理系统 PWA
const CACHE_NAME = "attendance-v1.0.0";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// 安装：预缓存静态资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，网络回退
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 仅处理 GET 请求
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 同源请求：缓存优先
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            // 缓存新的静态资源
            if (response.ok && response.type === "basic") {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => caches.match("/index.html"));
      })
    );
    return;
  }

  // 跨域请求（API等）：网络优先，失败回退
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
