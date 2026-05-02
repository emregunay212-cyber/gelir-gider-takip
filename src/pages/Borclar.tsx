import { Check } from 'lucide-react';
import { formatTRY, monthKey } from '../lib/format';
import { SEED_DEBTS, type SeedDebt } from '../db/seed';
import { useDebtPayment } from '../features/debt/DebtPaymentProvider';

const OWNER_LABEL: Record<'emre' | 'sila', string> = {
  emre: 'Emre',
  sila: 'Sıla',
};

const OWNER_COLOR: Record<'emre' | 'sila', string> = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)]',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)]',
};

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function monthLabel(key: string): string {
  const [year, m] = key.split('-');
  const idx = Number(m) - 1;
  return `${TR_MONTHS[idx] ?? m} ${year}`;
}

export default function Borclar() {
  const {
    isPaid,
    markPaid,
    unmarkPaid,
    remainingInstallments,
    effectivePrincipal,
    isClosedByPayments,
    monthlyPendingTotal,
    monthlyPaidTotal,
  } = useDebtPayment();

  const currentMonth = monthKey();
  const monthLabelText = monthLabel(currentMonth);

  const active = SEED_DEBTS.filter(
    (d) => !d.isPaidOff && !isClosedByPayments(d.name),
  ).sort((a, b) => b.monthlyPayment - a.monthlyPayment);
  const closed = SEED_DEBTS.filter(
    (d) => d.isPaidOff || isClosedByPayments(d.name),
  );

  const totalMonthly = active.reduce((acc, d) => acc + d.monthlyPayment, 0);
  const paidThisMonth = monthlyPaidTotal(currentMonth);
  const pendingThisMonth = monthlyPendingTotal(currentMonth);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Borçlar</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Aylık toplam ödeme:{' '}
          <span className="font-semibold text-[var(--color-danger)]">
            {formatTRY(totalMonthly)}
          </span>
          <span className="ml-1">· {active.length} aktif</span>
        </p>
      </div>

      {/* Bu ay özet */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-success)]">
            {monthLabelText} ödenen
          </p>
          <p className="mt-1 text-base font-bold text-[var(--color-success)]">
            {formatTRY(paidThisMonth)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-warning)]">
            Bekleyen
          </p>
          <p className="mt-1 text-base font-bold text-[var(--color-warning)]">
            {formatTRY(pendingThisMonth)}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {active.map((debt) => (
          <DebtCard
            key={debt.name}
            debt={debt}
            paid={isPaid(debt.name, currentMonth)}
            remaining={remainingInstallments(debt.name)}
            principal={effectivePrincipal(debt.name)}
            onMark={() => markPaid(debt.name, currentMonth)}
            onUnmark={() => unmarkPaid(debt.name, currentMonth)}
            monthLabel={monthLabelText}
          />
        ))}
      </ul>

      {closed.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-success)]">
            ✓ Tamamlanan Borçlar
          </p>
          <ul className="space-y-2">
            {closed.map((debt) => (
              <DebtCard
                key={debt.name}
                debt={debt}
                paid={false}
                remaining={0}
                principal={undefined}
                onMark={() => undefined}
                onUnmark={() => undefined}
                monthLabel={monthLabelText}
                closed
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

interface DebtCardProps {
  debt: SeedDebt;
  paid: boolean;
  remaining: number | undefined;
  principal: number | undefined;
  onMark: () => void;
  onUnmark: () => void;
  monthLabel: string;
  closed?: boolean;
}

function DebtCard({
  debt,
  paid,
  remaining,
  principal,
  onMark,
  onUnmark,
  monthLabel,
  closed,
}: DebtCardProps) {
  return (
    <li
      className={`rounded-xl border p-3 ${
        closed
          ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5 opacity-80'
          : paid
            ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${OWNER_COLOR[debt.ownerKey]}`}
            >
              {OWNER_LABEL[debt.ownerKey]}
            </span>
            <p
              className={`truncate font-medium ${closed ? 'line-through' : ''}`}
            >
              {debt.name}
            </p>
            {closed && (
              <span className="rounded bg-[var(--color-success)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                Kapandı
              </span>
            )}
            {paid && !closed && (
              <span className="rounded bg-[var(--color-success)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                {monthLabel} ödendi
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {debt.bankOrCreditor}
            {!closed && remaining != null
              ? ` · ${remaining} ay kaldı`
              : ''}
            {!closed && principal != null
              ? ` · ${formatTRY(principal)} kalan`
              : ''}
          </p>
          {debt.type === 'interest_only' && !closed && (
            <p className="mt-1 rounded bg-[var(--color-warning)]/15 px-2 py-1 text-[11px] text-[var(--color-warning)]">
              ⚠ Sadece faiz — ana borç sabit kalır.
            </p>
          )}
          {debt.notes && (
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">
              {debt.notes}
            </p>
          )}
        </div>
        <div className="text-right">
          <p
            className={`font-semibold ${
              closed ? 'text-[var(--color-muted)] line-through' : ''
            }`}
          >
            {formatTRY(debt.monthlyPayment)}
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">/ ay</p>
        </div>
      </div>

      {!closed && (
        <button
          type="button"
          onClick={paid ? onUnmark : onMark}
          className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
            paid
              ? 'bg-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/25'
              : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
          }`}
        >
          {paid && <Check size={14} />}
          {paid
            ? `${monthLabel} ödendi (geri al)`
            : `${monthLabel} ödendi olarak işaretle`}
        </button>
      )}
    </li>
  );
}
