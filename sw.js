// sw.js - 开发友好版：网络优先 (Network First)
// 修改后：每次刷新都会尝试获取最新代码，没网时才用缓存
const CACHE_NAME = 'shubao-phone-dev-v3'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './CSS/global.css',
  './CSS/pages.css',
  './CSS/widgets.css',
  './CSS/chat-page.css',
  './CSS/weixin.css', // 确保你的CSS文件夹里有这个，没有就删掉这行
  './JS/system.js',
  './JS/apps.js',
  './JS/chat.js',
  './JS/chat/sec-02-core-render.js',
  './JS/chat/sec-03-ai-prompt.js',
  './JS/chat/sec-04-role-state.js',
  './JS/chat/sec-05-ai-response.js',
  './JS/chat/sec-06-map-location.js',
  './JS/chat/sec-07-call-outgoing.js',
  './JS/chat/sec-08-call-incoming.js',
  './JS/chat/sec-09-menu-settings.js',
  './JS/chat/sec-10-navigation-tools.js',
  './JS/api.js',
  './JS/widgets.js',
  './JS/appearance.js',
  './JS/settings.js',
  './assets/icons/icon-512.png',
  './assets/icons/splash-screen.png'
];

// 1. 安装：还是把核心文件存一下
self.addEventListener('install', (e) => {
  console.log('SW: 正在安装...');
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const url of urlsToCache) {
          try {
            await cache.add(url);
          } catch (err) {}
        }
      })
      .then(() => self.skipWaiting())
  );
});

// 2. 激活：清理旧缓存
self.addEventListener('activate', (e) => {
  console.log('SW: 已激活');
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  const data = e && e.data ? e.data : null;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 3. 拦截请求：🔥 核心修改：网络优先策略 🔥
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  const isAssetRequest =
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.startsWith('/CSS/') ||
    url.pathname.startsWith('/JS/') ||
    url.pathname.startsWith('/assets/');

  if (!isAssetRequest) return;

  e.respondWith(
    // 第一步：先尝试去网络请求最新的
    fetch(e.request)
      .then(response => {
        if (!response || response.status === 206) return response;

        // 如果网络请求成功：
        // 1. 克隆一份响应（因为流只能用一次）
        const responseToCache = response.clone();
        
        // 2. 把最新的代码存进缓存，覆盖旧的！
        caches.open(CACHE_NAME)
          .then(cache => cache.put(e.request, responseToCache))
          .catch(() => {});

        // 3. 返回最新的给页面
        return response;
      })
      .catch(() => {
        // 第二步：如果没网（fetch失败），才去缓存里找
        return caches.match(e.request).then((cached) => cached || new Response('', { status: 504 }));
      })
  );
});
