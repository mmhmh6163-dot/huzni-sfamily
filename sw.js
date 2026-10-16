/* ============================================================
   Arizona AI — Service Worker v3
   Bulletproof: install never fails, offline-first, auto-update
   ============================================================ */

const CACHE_VERSION = 'v3';
const CACHE_NAME   = `arizona-ai-${CACHE_VERSION}`;
const OFFLINE_URL  = '/offline.html';

// Files to precache. If any fails, SW still installs.
const PRECACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/AI.Arizonan.html',
  '/chats.html',
  '/Friends.html',
  '/profile.html',
  '/notifications.html',
  '/style.css',
  '/auth.js',
  '/manifest.json',
  '/icon.png'
];

// External hosts — never intercept, always go to network
const NEVER_CACHE = [
  'supabase.co',
  'openrouter.ai',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'cloudflare.com',
  'google-analytics.com',
  'googletagmanager.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

/* ============================================================
   INSTALL — cache each file individually so one 404 can't break
   ============================================================ */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache each file individually — failures are logged, not fatal
      return Promise.all(
        PRECACHE.map((url) => {
          return cache.add(new Request(url, { cache: 'reload' }))
            .catch((err) => {
              console.warn('[SW] Skipped (failed to cache):', url, err.message);
            });
        })
      );
    })
    .then(() => {
      console.log('[SW] Install complete');
      return self.skipWaiting();
    })
  );
});

/* ============================================================
   ACTIVATE — wipe old caches owned by us
   ============================================================ */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k.startsWith('arizona-ai-') && k !== CACHE_NAME)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

/* ============================================================
   FETCH — smart routing with offline fallback
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET requests
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return; // Invalid URL — let browser handle
  }

  // Never touch external APIs
  if (NEVER_CACHE.some((host) => url.hostname.includes(host))) return;

  // Only handle http/https
  if (!url.protocol.startsWith('http')) return;

  // Skip Supabase function calls, realtime, and storage uploads
  if (url.pathname.includes('/functions/v1/')) return;
  if (url.pathname.includes('/storage/v1/')) return;
  if (url.pathname.includes('/realtime/v1/')) return;

  // -------- HTML pages: network-first with offline fallback --------
  const acceptsHTML = req.headers.get('accept')?.includes('text/html');
  const isNavigation = req.mode === 'navigate';

  if (acceptsHTML || isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cache a fresh copy
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          // Network failed — try cache, then offline page
          const cached = await caches.match(req);
          if (cached) return cached;

          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          // Last resort — inline HTML
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="background:#050a14;color:#fff;font-family:sans-serif;text-align:center;padding:60px 20px;"><h1>You are offline</h1><p>Please check your internet connection.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:20px;background:#5eb8ff;color:#fff;border:none;font-weight:700;cursor:pointer;">Retry</button></body></html>',
            { headers: { 'Content-Type': 'text/html' }, status: 503 }
          );
        })
    );
    return;
  }

  // -------- Other assets: cache-first with background refresh --------
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          // Only cache successful, same-origin, non-opaque responses
          if (
            res &&
            res.status === 200 &&
            res.type !== 'opaque' &&
            res.type !== 'opaqueredirect'
          ) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});

/* ============================================================
   MESSAGE — page can trigger immediate activation
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    );
  }
});

/* ============================================================
   PUSH — placeholder for future notifications
   ============================================================ */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); }
  catch (e) { data = { title: 'Arizona AI', body: event.data.text() }; }

  const options = {
    body: data.body || 'New notification from Arizona AI',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Arizona AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
