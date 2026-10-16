// ============================================================
// Arizona AI — Service Worker v2
// Enhanced: smarter caching, offline fallback, versioned cache
// ============================================================

const CACHE_VERSION = 'v2';
const CACHE_NAME = `arizona-ai-${CACHE_VERSION}`;

// Files to precache on install
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
  '/icon.jpeg'          // ← renamed from "arizonan png icon.jpeg"
];

// External hosts — never cache, always network
const NEVER_CACHE = [
  'supabase.co',
  'openrouter.ai',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'cloudflare.com',
  'google-analytics.com',
  'googletagmanager.com'
];

// ============================================================
// INSTALL — precache the app shell
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Use { cache: 'reload' } so we don't serve stale files during install
        return cache.addAll(
          PRECACHE.map(url => new Request(url, { cache: 'reload' }))
        );
      })
      .then(() => {
        console.log('[SW] Precached ' + PRECACHE.length + ' files');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((err) => {
        console.error('[SW] Precache failed:', err);
      })
  );
});

// ============================================================
// ACTIVATE — clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + CACHE_VERSION);

  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter(k => k.startsWith('arizona-ai-') && k !== CACHE_NAME)
            .map(k => {
              console.log('[SW] Deleting old cache:', k);
              return caches.delete(k);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// ============================================================
// FETCH — smart routing
// ============================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip external APIs entirely — let browser handle them
  if (NEVER_CACHE.some(host => url.hostname.includes(host))) return;

  // Skip non-http(s) schemes (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // -------- HTML pages: network-first, fallback to cache --------
  const isHTML = req.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache fresh HTML
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => {
          // Offline — try cache, fallback to index
          return caches.match(req)
            .then(cached => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // -------- Other assets: cache-first with background update --------
  event.respondWith(
    caches.match(req).then((cached) => {
      // Serve from cache immediately if we have it
      const networkFetch = fetch(req)
        .then((res) => {
          // Only cache successful, non-opaque responses
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached); // If network fails, fall back to cache

      // Return cached instantly if available, else wait for network
      return cached || networkFetch;
    })
  );
});

// ============================================================
// MESSAGE — allows page to trigger skipWaiting
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================
// PUSH (placeholder for future notifications)
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from Arizona AI',
    icon: '/icon.jpeg',
    badge: '/icon.jpeg',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Arizona AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
