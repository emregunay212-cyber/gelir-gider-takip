import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * PWA güncellemelerini izler. Yeni sürüm yüklendiğinde kullanıcıya
 * "Yenile" aksiyonlu bir toast gösterir — tek tıkla güncel sürüm aktif olur.
 * Cache temizleme veya hard refresh derdi yok.
 */
export function PWAUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Saatte bir kere SW'in yeni sürüm var mı kontrol et
      setInterval(() => {
        registration.update().catch(() => undefined);
      }, ONE_HOUR_MS);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;

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

    return () => {
      toast.dismiss(id);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
