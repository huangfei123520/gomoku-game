// ============= 五子棋 Service Worker =============
const CACHE_NAME = 'gomoku-v1';
const ASSETS = [
    'index.html',
    'style.css',
    'game.js',
    'ai.js',
    'sound.js',
    'network.js',
    'app.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

// 安装时预缓存所有静态资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// 网络优先，缓存后备策略
self.addEventListener('fetch', (event) => {
    // 只处理同源请求
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // 缓存成功响应的副本
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    // 离线时从缓存读取
                    return caches.match(event.request);
                })
        );
    }
});