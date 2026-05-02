import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { showNotification } from '@/lib/notifications';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * PWA güncellemelerini izler. Yeni sürüm yüklendiğinde:
 *  - Sonner toast (uygulama açıkken)
 *  - Sistem bildirimi (kullanıcı izin verdiyse, uygulama kapalı olsa bile)
 * Tek tıkla `updateServiceWorker(true)` → yeni sürüm aktif + sayfa yenilenir.
 *
 * Update kontrolü:
 *  - Sayfa açıldığında hemen
 *  - Sayfa visible olduğunda (kullanıcı tab'a geri döndüğünde)
 *  - Saatte bir
 */
export function PWAUpdater() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      registrationRef.current = registration;

      // İlk kayıttan hemen sonra bir kontrol
      registration.update().catch(() => undefined);

      // Saatte bir periyodik kontrol
      setInterval(() => {
        registration.update().catch(() => undefined);
      }, ONE_HOUR_MS);
    },
  });

  // Sayfa visible / focus olunca yeni sürüm var mı kontrol et
  useEffect(() => {
    function checkForUpdate() {
      registrationRef.current?.update().catch(() => undefined);
    }
    function onVisible() {
      if (document.visibilityState === 'visible') checkForUpdate();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', checkForUpdate);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', checkForUpdate);
    };
  }, []);

  useEffect(() => {
    if (!needRefresh) return;

    // Sonner toast (uygulama açık iken)
    const id = toast('🔔 Yeni sürüm hazır', {
      description: 'En son özellikler için tek tıkla güncelle.',
      duration: Infinity,
      action: {
        label: 'Güncelle',
        onClick: () => {
          updateServiceWorker(true);
        },
      },
      onDismiss: () => setNeedRefresh(false),
    });

    // Telefon bildirimi (izin verildiyse)
    void showNotification({
      title: '🔔 Yeni Sürüm Hazır',
      body: 'Aile Bütçe güncellendi. Tıkla, hemen güncelle.',
      tag: 'app-update',
      requireInteraction: true,
      onClick: () => {
        updateServiceWorker(true);
      },
    });

    return () => {
      toast.dismiss(id);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}

/**
 * Manuel update kontrolü tetikleyici. Ayarlar'dan çağrılır.
 * Promise döner — true: yeni sürüm var, false: zaten güncel.
 */
export async function checkForAppUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const previousWaiting = registration.waiting;
    await registration.update();
    // Update sonrası waiting'de yeni SW var mı?
    const stillWaiting = registration.waiting;
    return Boolean(stillWaiting && stillWaiting !== previousWaiting);
  } catch {
    return false;
  }
}
