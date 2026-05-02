// Service Worker üzerinde notification click event'ini yakalar.
// vite-plugin-pwa workbox.importScripts ile yüklenir.
//
// Bildirim tıklandığında:
//  1. Açık sekme varsa → focus + JS'e mesaj yolla
//  2. Açık sekme yoksa → yeni sekme aç (?update=1)

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tag = event.notification.tag;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            try {
              client.postMessage({ type: 'notification-click', tag });
            } catch {
              // sessizce geç
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/?update=1');
        }
        return undefined;
      }),
  );
});
