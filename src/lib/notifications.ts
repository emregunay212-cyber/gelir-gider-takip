/**
 * Tarayıcı Notification API helper'ları.
 * Service Worker üzerinden showNotification kullanılırsa cihaz açıkken
 * arka planda da çalışır; window.Notification ise sayfa açık olduğunda çalışır.
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';

  // Samsung Internet ve bazı eski tarayıcılar callback-style API kullanır.
  // Modern Chromium Promise döner. İkisini de destekle.
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: NotificationPermission) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      const maybePromise = Notification.requestPermission((legacyResult) => {
        finish(legacyResult);
      });
      // Modern tarayıcılarda Promise dönerse onu da bekle
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise
          .then((result) => finish(result))
          .catch(() => finish('denied'));
      }
      // Hiçbir callback / promise tetiklenmezse 8 sn sonra fallback
      setTimeout(() => finish(Notification.permission), 8000);
    } catch {
      finish('denied');
    }
  });
}

interface ShowOptions {
  title: string;
  body: string;
  /** Aynı tag'li bildirim varsa üzerine yazar (yenilemez yığın yapmaz). */
  tag?: string;
  icon?: string;
  /** Kullanıcı manuel kapatana kadar görünür kalsın mı. */
  requireInteraction?: boolean;
  /** Bildirime tıklayınca tetiklenir. */
  onClick?: () => void;
}

/**
 * Önce service worker registration üzerinden showNotification dener
 * (background'da da çalışır), olmazsa window.Notification ile fallback.
 */
export async function showNotification(options: ShowOptions): Promise<void> {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const {
    title,
    body,
    tag = 'app-update',
    icon = '/favicon.svg',
    requireInteraction = true,
    onClick,
  } = options;

  // Service worker üzerinden — daha güvenilir, background'da da çalışır
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        tag,
        icon,
        badge: icon,
        requireInteraction,
      });

      // SW notification'ı için click handler — focus + onClick
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'notification-click' && event.data.tag === tag) {
          onClick?.();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage, {
        once: true,
      });
      return;
    } catch {
      // SW gönderim başarısızsa fallback'e düş
    }
  }

  // Fallback: window.Notification
  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon,
      requireInteraction,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // sessizce geç
  }
}
