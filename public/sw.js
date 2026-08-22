/* eslint-disable no-undef */
/**
 * Service Worker — نَبّهني
 * ---------------------------------------------------------------------------
 * ثلاث مسؤوليات:
 *   1) استقبال الإشعارات الدافعة (Web Push) وعرضها حتى والتطبيق مغلق.
 *   2) فتح الصفحة الصحيحة عند الضغط على الإشعار (أو التركيز على تبويب مفتوح).
 *   3) تخزين مؤقت خفيف: الأصول ثابتة (cache-first)، الصفحات شبكة-أولًا مع
 *      صفحة بديلة عند انقطاع الاتصال. طلبات /api لا تُخزَّن أبدًا حتى لا
 *      تُعرض بيانات قديمة.
 */

const VERSION = 'nabbihni-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = '/offline';

const PRECACHE = ['/offline', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // البيانات دائمًا من الشبكة

  // أصول Next الثابتة: من التخزين المؤقت أولًا
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // صفحات التنقّل: الشبكة أولًا ثم النسخة المخزّنة ثم صفحة عدم الاتصال
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
  }
});

/* ----------------------------- الإشعارات الدافعة ----------------------------- */

self.addEventListener('push', (event) => {
  let payload = { title: 'نَبّهني', body: 'لديك تذكير جديد.', url: '/dashboard' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      tag: payload.tag || 'nabbihni-reminder',
      renotify: true,
      dir: 'rtl',
      lang: 'ar',
      vibrate: [100, 50, 100],
      data: { url: payload.url || '/dashboard', ...(payload.data || {}) },
      actions: [
        { action: 'open', title: 'عرض' },
        { action: 'dismiss', title: 'تجاهل' },
      ],
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const target = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
