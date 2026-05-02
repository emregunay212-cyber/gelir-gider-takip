import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { formatTRY, monthKey } from '../lib/format';
import { SEED_RECURRING_EXPENSES } from '../db/seed';
import type { RecurringExpenseCategory } from '../types';
import { useBills } from '../features/bills/BillsProvider';
import { EditBillDialog } from '../features/bills/EditBillDialog';

const CATEGORY_LABEL: Record<RecurringExpenseCategory, string> = {
  electricity: 'Elektrik',
  water: 'Su',
  gas: 'Doğalgaz',
  phone: 'Telefon',
  internet: 'İnternet',
  subscription: 'Abonelik',
  other: 'Diğer',
};

const CATEGORY_ICON: Record<RecurringExpenseCategory, string> = {
  electricity: '⚡',
  water: '💧',
  gas: '🔥',
  phone: '📱',
  internet: '🌐',
  subscription: '📺',
  other: '📄',
};

export default function Faturalar() {
  const { getAmount, isPaid, togglePaid, monthlyTotal, monthlyPaidTotal } =
    useBills();
  const [editing, setEditing] = useState<string | null>(null);
  const currentMonth = monthKey();
  const total = monthlyTotal();
  const paidTotal = monthlyPaidTotal(currentMonth);
  const pendingTotal = total - paidTotal;
  const hasMissing = SEED_RECURRING_EXPENSES.some(
    (b) => getAmount(b.name) === 0,
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Faturalar</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Aylık toplam:{' '}
          <span className="font-semibold text-[var(--color-text)]">
            {formatTRY(total)}
          </span>
        </p>
      </div>

      {/* Bu ay özeti */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-success)]">
            Bu ay ödenen
          </p>
          <p className="mt-1 text-base font-bold text-[var(--color-success)]">
            {formatTRY(paidTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-warning)]">
            Bekleyen
          </p>
          <p className="mt-1 text-base font-bold text-[var(--color-warning)]">
            {formatTRY(pendingTotal)}
          </p>
        </div>
      </div>

      {hasMissing && (
        <div className="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
          ⚠ Bazı fatura tutarları boş — kalemin yanındaki kalem ikonuna tıkla,
          tutarı gir.
        </div>
      )}

      <ul className="space-y-2">
        {SEED_RECURRING_EXPENSES.map((bill) => {
          const amount = getAmount(bill.name);
          const paid = isPaid(bill.name, currentMonth);
          return (
            <li
              key={bill.name}
              className={`rounded-xl border p-3 transition-colors ${
                paid
                  ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    {CATEGORY_ICON[bill.category]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium">{bill.name}</p>
                      {paid && (
                        <span className="rounded bg-[var(--color-success)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-success)]">
                          Ödendi
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      {CATEGORY_LABEL[bill.category]} · ayın{' '}
                      {bill.paymentDayOfMonth}'i
                      {bill.ownerKey
                        ? ` · ${bill.ownerKey === 'emre' ? 'Emre' : 'Sıla'}`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold tabular-nums ${
                      amount === 0
                        ? 'text-[var(--color-muted)]'
                        : 'text-[var(--color-danger)]'
                    }`}
                  >
                    {amount === 0 ? '—' : formatTRY(amount)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing(bill.name)}
                    className="rounded p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-primary)]"
                    aria-label="Düzenle"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>

              {amount > 0 && (
                <button
                  type="button"
                  onClick={() => togglePaid(bill.name, currentMonth)}
                  className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    paid
                      ? 'bg-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/25'
                      : 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  {paid && <Check size={14} />}
                  {paid ? 'Bu ay ödendi (geri al)' : 'Bu ay ödendi olarak işaretle'}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {editing && (
        <EditBillDialog
          billName={editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
