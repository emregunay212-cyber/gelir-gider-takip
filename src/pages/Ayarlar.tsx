import { useEffect, useState, type ReactNode } from 'react';
import {
  RotateCcw,
  Download,
  FileSpreadsheet,
  Bell,
  BellOff,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTRY } from '@/lib/format';
import { useDataExport } from '@/features/export/useDataExport';
import { useSettings, type Theme } from '@/features/settings/SettingsProvider';
import { EditDailyLimitDialog } from '@/features/settings/EditDailyLimitDialog';
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  showNotification,
} from '@/lib/notifications';
import { checkForAppUpdate } from '@/components/PWAUpdater';

const STORAGE_KEYS_TO_CLEAR = [
  'salary_receipts_v1',
  'salary_receipts_seeded_v1',
  'salary_receipts_seeded_fs_v1',
  'salary_receipts_migrated_v1',
  'cash_entries_v1',
  'cash_entries_migrated_v1',
  'expense_entries_v1',
  'expense_entries_migrated_v1',
  'bills_state_v1',
  'bills_state_migrated_v1',
  'debt_payments_v1',
  'debt_payments_seeded_v1',
  'debt_payments_seeded_fs_v1',
  'debt_payments_unmark_v1',
  'debt_payments_migrated_v1',
];

function clearAllLocalState(): void {
  for (const key of STORAGE_KEYS_TO_CLEAR) {
    try {
      localStorage.removeItem(key);
    } catch {
      // sessizce geç
    }
  }
}

export default function Ayarlar() {
  const [confirming, setConfirming] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [editingLimit, setEditingLimit] = useState(false);
  const { downloadJson, downloadExpensesCsv } = useDataExport();
  const { dailyLimit, theme, resolvedTheme, setTheme } = useSettings();

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    () => getNotificationPermission(),
  );
  const notifSupported = isNotificationSupported();

  useEffect(() => {
    // Tarayıcı dışında değişiklikler için periyodik kontrol
    const interval = window.setInterval(() => {
      setNotifPermission(getNotificationPermission());
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  async function handleEnableNotifications() {
    if (!isNotificationSupported()) {
      toast.error('Tarayıcı bildirimi desteklemiyor');
      return;
    }

    const before = getNotificationPermission();
    if (before === 'denied') {
      toast.error('Bildirim izni engelli', {
        description:
          'Tarayıcının site ayarlarından (🔒 ikonu → Bildirimler) açman gerek.',
        duration: 10000,
      });
      return;
    }

    toast.info('İzin penceresi açılıyor...', {
      description: 'Görmüyorsan tarayıcının üst kısmına bak.',
      duration: 4000,
    });

    try {
      const result = await requestNotificationPermission();
      setNotifPermission(result);

      if (result === 'granted') {
        toast.success('Bildirimler açıldı 🔔');
        void showNotification({
          title: '🔔 Bildirimler aktif',
          body: 'Aile Bütçe artık seninle iletişim kurabilir.',
          tag: 'notification-test',
          requireInteraction: false,
        });
        // Bildirim gelip gelmediğini kullanıcı doğrulasın
        window.setTimeout(() => {
          toast.info('Test bildirimi yollandı 📲', {
            description:
              'Bildirim çubuğuna geldi mi? Gelmediyse: Samsung Internet için önce "Ana Ekrana Ekle" yapman, sistem ayarlarından bu site için bildirim izni vermen gerekebilir.',
            duration: 15000,
          });
        }, 1200);
      } else if (result === 'denied') {
        toast.error('İzin verilmedi', {
          description:
            'Tekrar denemek için: 🔒 ikonu → Site ayarları → Bildirimler → İzin Ver.',
          duration: 10000,
        });
      } else {
        toast.warning('İzin penceresi kapatıldı', {
          description: 'Beklenmedik bir durum oldu. Tekrar dener misin?',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      toast.error('Hata: ' + message);
    }
  }

  async function handleCheckUpdate() {
    setCheckingUpdate(true);
    try {
      const hasUpdate = await checkForAppUpdate();
      if (hasUpdate) {
        toast.success('Yeni sürüm bulundu 🎉', {
          description: 'Yukarıdaki "Güncelle" toast\'una tıkla.',
        });
      } else {
        toast.info('Zaten en güncel sürüm', {
          description: 'Yeni sürüm yayınlandığında otomatik bildirim gelir.',
        });
      }
    } catch (err) {
      toast.error('Kontrol başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    } finally {
      setCheckingUpdate(false);
    }
  }

  function handleReset() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    clearAllLocalState();
    window.location.reload();
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Ayarlar</h2>
        <p className="text-sm text-muted-foreground">
          Limit, tema ve veri yönetimi.
        </p>
      </div>

      <div className="space-y-3">
        <SettingsCard title="Günlük Harcama Limiti">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold tabular-nums">
              {formatTRY(dailyLimit)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingLimit(true)}
            >
              Düzenle
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Aşım olursa ertesi günkü limit azalır; kalan miktar kasaya yatar.
            Tüm cihazlarda anında senkronize olur.
          </p>
        </SettingsCard>

        <SettingsCard title="Tema">
          <p className="mb-3 text-xs text-muted-foreground">
            Şu an: {' '}
            <span className="font-medium text-foreground">
              {resolvedTheme === 'dark' ? 'Koyu' : 'Açık'}
            </span>
            {theme === 'system' && (
              <span className="text-muted-foreground"> · sistem ayarına göre</span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <ThemeOption
              icon={<Sun className="size-4" />}
              label="Açık"
              value="light"
              current={theme}
              onSelect={setTheme}
            />
            <ThemeOption
              icon={<Moon className="size-4" />}
              label="Koyu"
              value="dark"
              current={theme}
              onSelect={setTheme}
            />
            <ThemeOption
              icon={<Monitor className="size-4" />}
              label="Sistem"
              value="system"
              current={theme}
              onSelect={setTheme}
            />
          </div>
        </SettingsCard>

        <SettingsCard title="Uygulama Güncellemesi">
          <p className="text-sm text-muted-foreground">
            Yeni sürüm yayınlandığında saatte bir otomatik kontrol edilir.
            Hemen kontrol etmek istersen aşağıdaki butona tıkla.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            className="mt-3 w-full"
          >
            <RefreshCw
              className={`size-4 ${checkingUpdate ? 'animate-spin' : ''}`}
            />
            {checkingUpdate ? 'Kontrol ediliyor...' : 'Güncellemeleri Kontrol Et'}
          </Button>
        </SettingsCard>

        <SettingsCard title="Bildirimler">
          {!notifSupported ? (
            <p className="text-sm text-muted-foreground">
              Bu tarayıcı bildirim özelliğini desteklemiyor.
            </p>
          ) : notifPermission === 'granted' ? (
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-success)]/15 text-[var(--color-success)]">
                <Bell className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Bildirimler açık</p>
                <p className="text-xs text-muted-foreground">
                  Yeni sürüm geldiğinde telefon bildirimi alacaksın.
                </p>
              </div>
            </div>
          ) : notifPermission === 'denied' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[var(--color-danger)]/15 text-[var(--color-danger)]">
                  <BellOff className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Bildirimler engelli</p>
                  <p className="text-xs text-muted-foreground">
                    Tarayıcı ayarlarından izin vermen gerek (🔒 ikonu → Site
                    ayarları → Bildirimler).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Yeni sürüm geldiğinde sana haber vereyim mi? Telefon ekranında
                bildirim olarak gelir, tek tıkla güncellenir.
              </p>
              <Button
                type="button"
                onClick={handleEnableNotifications}
                className="w-full"
              >
                <Bell className="size-4" />
                Bildirimleri Aç
              </Button>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  Samsung Internet kullanıyorsan oku
                </summary>
                <div className="mt-2 space-y-1 pl-2">
                  <p>
                    Samsung Internet'te bildirim için önce siteyi{' '}
                    <strong>Ana Ekrana Ekle</strong> ile PWA olarak yüklemen
                    gerekebilir:
                  </p>
                  <ol className="ml-4 list-decimal space-y-0.5">
                    <li>
                      Tarayıcının alt menüsünden ⋮ → "Sayfayı ekle" → "Ana
                      ekran"
                    </li>
                    <li>Açılan PWA ikonuyla siteyi tekrar aç</li>
                    <li>"Bildirimleri Aç" butonuna tekrar bas</li>
                    <li>Sistem dialogunda "İzin Ver"</li>
                  </ol>
                  <p className="pt-1">
                    Çalışmazsa: <strong>Samsung Internet → Ayarlar → Site
                    izinleri → Bildirimler</strong> üzerinden manuel açabilirsin.
                  </p>
                </div>
              </details>
            </div>
          )}
        </SettingsCard>

        <SettingsCard title="Yedekleme & Dışa Aktarma">
          <p className="text-sm text-muted-foreground">
            Tüm verilerin JSON yedeği veya harcamaların Excel uyumlu CSV dosyası.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadJson()}
              className="w-full"
            >
              <Download className="size-4" />
              Tam Yedek (JSON)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadExpensesCsv()}
              className="w-full"
            >
              <FileSpreadsheet className="size-4" />
              Harcamalar (CSV / Excel)
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard title="Veri Sıfırlama">
          <p className="text-sm text-muted-foreground">
            Maaş kayıtları, manuel kasa hareketleri ve günlük harcamalar silinir.
            Borç ve hesap seed datası değişmez. Test sonrası temiz başlamak için
            kullan.
          </p>
          <Button
            type="button"
            onClick={handleReset}
            variant={confirming ? 'destructive' : 'outline'}
            className="mt-3 w-full"
          >
            <RotateCcw className="size-4" />
            {confirming
              ? 'Onayla — tüm yerel veriler silinecek'
              : 'Test Verilerini Sıfırla'}
          </Button>
          {confirming && (
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:underline"
            >
              Vazgeç
            </button>
          )}
        </SettingsCard>

        <SettingsCard title="Hane Üyeleri">
          <p className="text-sm text-muted-foreground">
            Emre · Sıla. Davet linki ve renk değiştirme (Faz 6).
          </p>
        </SettingsCard>
      </div>

      <EditDailyLimitDialog
        open={editingLimit}
        onClose={() => setEditingLimit(false)}
      />
    </section>
  );
}

interface SettingsCardProps {
  title: string;
  children: ReactNode;
}

function SettingsCard({ title, children }: SettingsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="mt-2">{children}</div>
      </CardContent>
    </Card>
  );
}

interface ThemeOptionProps {
  icon: ReactNode;
  label: string;
  value: Theme;
  current: Theme;
  onSelect: (value: Theme) => Promise<void>;
}

function ThemeOption({
  icon,
  label,
  value,
  current,
  onSelect,
}: ThemeOptionProps) {
  const isActive = current === value;
  return (
    <button
      type="button"
      onClick={() => {
        if (!isActive) {
          void onSelect(value);
        }
      }}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
        isActive
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
      aria-pressed={isActive}
    >
      {icon}
      {label}
    </button>
  );
}
