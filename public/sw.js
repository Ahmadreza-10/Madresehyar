/* Service Worker مدرسه‌یار: دریافت اعلان (Web Push) و باز کردن صفحه‌ی ثبت گزارش با کلیک روی آن */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let d = {}; try { d = event.data ? event.data.json() : {}; } catch (_) { d = { title: 'مدرسه‌یار', body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'مدرسه‌یار', { body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', dir: 'rtl', lang: 'fa', tag: d.tag || 'madrasehyar', renotify: true, requireInteraction: true, data: { url: d.url || '/study' } }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); const url = (event.notification.data && event.notification.data.url) || '/study';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => { for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } } return self.clients.openWindow(url); }));
});
