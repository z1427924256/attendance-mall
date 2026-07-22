// SPA 路由中间件：精确控制 H5 + Admin + API 的路由分发
// 关键：用目录路径（/admin/）而非 .html 路径，避免 Cloudflare 308 URL 美化

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // /api/* 交给 API Function 处理（functions/api/[[path]].ts）
  if (path.startsWith('/api/') || path === '/api') {
    return next();
  }

  // /admin/sw.js、/admin/kill-sw.js 或 /sw.js 直接返回自毁 SW，强制清理浏览器残留的旧 SW
  if (path === '/admin/sw.js' || path === '/admin/kill-sw.js' || path === '/sw.js' || path === '/kill-sw.js') {
    const killSw = `self.addEventListener('install', e => e.waitUntil(caches.keys().then(k => Promise.all(k.map(c => caches.delete(c)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.registration.unregister().then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)))));
self.addEventListener('fetch', () => {});`;
    return new Response(killSw, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Service-Worker-Allowed': '/admin/',
      },
    });
  }

  // 静态资源（有文件扩展名）直接返回
  if (/\.\w+$/.test(path)) {
    return env.ASSETS.fetch(request);
  }

  // /admin 开头的路径 → 请求 /admin/ 目录索引（返回 admin/index.html，不触发 308）
  if (path === '/admin' || path.startsWith('/admin/')) {
    const adminUrl = new URL('/admin/', url.origin);
    return env.ASSETS.fetch(new Request(adminUrl, { method: 'GET', headers: request.headers }));
  }

  // 其他所有路径 → 请求 / 根目录索引（返回 index.html，不触发 308）
  const rootUrl = new URL('/', url.origin);
  return env.ASSETS.fetch(new Request(rootUrl, { method: 'GET', headers: request.headers }));
};
