// Arizona AI — Service Worker v1
const CACHE_NAME = 'arizona-ai-v1';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/AI.Arizonan.html',
  '/chats.html',
  '/Friends.html',
  '/profile.html',
  '/notifications.html',
  '/style.css',
  '/auth.js',
  '/manifest.json',
  '/arizonan%20png%20icon.jpeg'
];

// Install — precache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })));
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — network-first for HTML, cache-first for assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip non-GET
  if (req.method !== 'GET') return;

  // Skip Supabase / external APIs — always go to network
  const url = new URL(req.url);
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('openrouter.ai')) return;
  if (url.hostname.includes('cdn.jsdelivr.net')) return;
  if (url.hostname.includes('cloudflare')) return;

  // HTML — network first, fallback to cache
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Other assets — cache first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() => cached);
    })
  );
});

// Handle messages from the page (for future push support)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
