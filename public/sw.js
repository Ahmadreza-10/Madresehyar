/* Service Worker مدرسه‌یار: دریافت اعلان (Web Push) و باز کردن صفحه‌ی ثبت گزارش با کلیک روی آن */
/* نسخه‌ی کش: با تغییر این عدد، کش‌های قدیمی هنگام فعال‌شدن پاک می‌شوند */
const CACHE = 'madrasehyar-v1';
const PRECACHE = ['/offline.html', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
/* فقط درخواست‌های GET. صفحه‌های سایت (که اطلاعات خصوصی دارند) و /api هرگز کش نمی‌شوند؛ اگر اینترنت قطع بود، صفحه‌ی «آفلاین» نشان داده می‌شود.
   فقط آیکون‌ها از کش خوانده می‌شوند. */
self.addEventListener('fetch', (event) => {
  const req = event.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') { event.respondWith(fetch(req).catch(() => caches.match('/offline.html'))); return; }
  if (url.pathname.startsWith('/icons/')) event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })));
});
self.addEventListener('push', (event) => {
  let d = {}; try { d = event.data ? event.data.json() : {}; } catch (_) { d = { title: 'مدرسه‌یار', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'مدرسه‌یار', { body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', dir: 'rtl', lang: 'fa', tag: d.tag || 'madrasehyar', renotify: true, requireInteraction: true, data: { url: d.url || '/study' } }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); const url = (event.notification.data && event.notification.data.url) || '/study';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => { for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
