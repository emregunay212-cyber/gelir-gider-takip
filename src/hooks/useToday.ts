import { useEffect, useState } from 'react';
import { todayKey } from '../lib/format';

// Bugünün tarih anahtarını (YYYY-MM-DD) döndürür ve gece 00:00 geçildiğinde
// otomatik olarak yeniler — sayfayı yenilemeden bugünkü listeler sıfırlanır.
export function useToday(): string {
  const [today, setToday] = useState<string>(() => todayKey());

  useEffect(() => {
    function tick() {
      const next = todayKey();
      setToday((prev) => (prev === next ? prev : next));
    }

    // 30 saniyede bir kontrol — gece yarısı geçişi en geç 30 sn sonra yakalanır
    const interval = window.setInterval(tick, 30_000);

    // Telefonu açtığında / sekmeyi geri aldığında anında kontrol
    function onVisibility() {
      if (document.visibilityState === 'visible') tick();
    }
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', tick);
    };
  }, []);

  return today;
}
