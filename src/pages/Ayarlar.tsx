import { useState, type ReactNode } from 'react';
import { RotateCcw, Download, FileSpreadsheet } from 'lucide-react';
import { SEED_HOUSEHOLD } from '../db/seed';
import { formatTRY } from '../lib/format';
import { useDataExport } from '../features/export/useDataExport';

const STORAGE_KEYS_TO_CLEAR = [
  'salary_receipts_v1',
  'salary_receipts_seeded_v1',
  'cash_entries_v1',
  'expense_entries_v1',
  'bills_state_v1',
  'debt_payments_v1',
  'debt_payments_seeded_v1',
  'debt_payments_unmark_v1',
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
        <p className="text-sm text-[var(--color-muted)]">
          Limit, tema ve veri yönetimi.
        </p>
      </div>

      <div className="space-y-3">
        <Card title="Günlük Harcama Limiti">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold">
              {formatTRY(SEED_HOUSEHOLD.defaultDailyLimit)}
            </p>
            <button
              type="button"
              disabled
              className="rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-sm text-[var(--color-muted)]"
            >
              Düzenle (Faz 6)
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            300 TL yaşam + 210 TL sigara dahil. Aşım olursa ertesi günkü limit
            azalır; kalan miktar kasaya yatar.
          </p>
        </Card>

        <Card title="Tema">
          <p className="text-sm text-[var(--color-muted)]">
            Açık · Koyu · Sistem (Faz 6)
          </p>
        </Card>

        <Card title="Yedekleme & Dışa Aktarma">
          <p className="text-sm text-[var(--color-muted)]">
            Tüm verilerin JSON yedeği veya harcamaların Excel uyumlu CSV dosyası.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={downloadJson}
              className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            >
              <Download size={16} />
              Tam Yedek (JSON)
            </button>
            <button
              type="button"
              onClick={downloadExpensesCsv}
              className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
            >
              <FileSpreadsheet size={16} />
              Harcamalar (CSV / Excel)
            </button>
          </div>
        </Card>

        <Card title="Veri Sıfırlama">
          <p className="text-sm text-[var(--color-muted)]">
            Maaş kayıtları, manuel kasa hareketleri ve günlük harcamalar silinir.
            Borç ve hesap seed datası değişmez. Test sonrası temiz başlamak için
            kullan.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              confirming
                ? 'bg-[var(--color-danger)] text-white hover:opacity-90'
                : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
            }`}
          >
            <RotateCcw size={16} />
            {confirming
              ? 'Onayla — tüm yerel veriler silinecek'
              : 'Test Verilerini Sıfırla'}
          </button>
          {confirming && (
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="mt-2 w-full text-center text-xs text-[var(--color-muted)] hover:underline"
            >
              Vazgeç
            </button>
          )}
        </Card>

        <Card title="Hane Üyeleri">
          <p className="text-sm text-[var(--color-muted)]">
            Emre · Sıla. Davet linki ve renk değiştirme (Faz 6).
          </p>
        </Card>
      </div>
    </section>
  );
}

interface CardProps {
  title: string;
  children: ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
