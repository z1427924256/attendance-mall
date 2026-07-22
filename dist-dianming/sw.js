// 自毁型 Service Worker：注册后立即注销所有 SW 并清空全部缓存
// 用于清理之前错误安装的 SW（曾把 HTML 当作 sw.js 安装导致白屏）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      })
  );
});

// 不拦截任何请求
self.addEventListener('fetch', () => {});
