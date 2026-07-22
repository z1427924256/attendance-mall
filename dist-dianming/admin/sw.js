// Service Worker - 商场考勤管理系统 PWA
// 版本号变更会触发 activate 清理所有旧缓存（包括 React 老版本残留资源）
const CACHE_NAME = "attendance-vue-1.0.0";
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

// 激活：清理所有非当前版本的缓存（清除 React 版残留）
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：网络优先，缓存回退（确保拿到最新 Vue 资源，避免 React 旧缓存污染）
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 仅处理 GET 请求
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 同源导航请求（HTML）：网络优先，确保拿到最新 index.html
  if (url.origin === self.location.origin && request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // 同源静态资源（JS/CSS）：网络优先，回退缓存
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 跨域请求（API等）：网络优先，失败回退
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
