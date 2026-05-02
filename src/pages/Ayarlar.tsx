import { useState, type ReactNode } from 'react';
import { RotateCcw, Download, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SEED_HOUSEHOLD } from '@/db/seed';
import { formatTRY } from '@/lib/format';
import { useDataExport } from '@/features/export/useDataExport';

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
  const { downloadJson, downloadExpensesCsv } = useDataExport();

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
              {formatTRY(SEED_HOUSEHOLD.defaultDailyLimit)}
            </p>
            <Button type="button" variant="outline" size="sm" disabled>
              Düzenle (Faz 6)
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            300 TL yaşam + 210 TL sigara dahil. Aşım olursa ertesi günkü limit
            azalır; kalan miktar kasaya yatar.
          </p>
        </SettingsCard>

        <SettingsCard title="Tema">
          <p className="text-sm text-muted-foreground">
            Şu an: <span className="font-medium text-foreground">Koyu (Dark)</span> ·
            açık tema seçimi sonraki fazda
          </p>
        </SettingsCard>

        <SettingsCard title="Yedekleme & Dışa Aktarma">
          <p className="text-sm text-muted-foreground">
            Tüm verilerin JSON yedeği veya harcamaların Excel uyumlu CSV dosyası.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={downloadJson}
              className="w-full"
            >
              <Download className="size-4" />
              Tam Yedek (JSON)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadExpensesCsv}
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
