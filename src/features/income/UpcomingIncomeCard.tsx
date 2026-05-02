import { useState } from 'react';
import { Banknote, Check } from 'lucide-react';
import { SEED_INCOMES } from '../../db/seed';
import { useSalary } from './SalaryProvider';
import { formatTRY, monthKey } from '../../lib/format';
import { SalaryReceivedDialog } from './SalaryReceivedDialog';

interface PendingItem {
  incomeName: string;
  defaultAmount: number;
  accountName: string;
  ownerKey: 'emre' | 'sila';
  dayOfMonth: number;
}

// Hangi maaş hangi hesaba düşüyor — Faz 6'da Ayarlar'dan yönetilebilir olacak.
const ACCOUNT_BY_OWNER: Record<'emre' | 'sila', string> = {
  emre: 'Emre Garanti',
  sila: 'Sıla Garanti',
};

function getMonthlySalaries(): PendingItem[] {
  return SEED_INCOMES.filter(
    (i) => i.frequency === 'monthly' && i.category === 'salary',
  ).map((income) => {
    const defaultAmount =
      income.amountFixed ??
      (income.amountMin != null && income.amountMax != null
        ? (income.amountMin + income.amountMax) / 2
        : 0);
    return {
      incomeName: income.name,
      defaultAmount,
      accountName: ACCOUNT_BY_OWNER[income.ownerKey],
      ownerKey: income.ownerKey,
      dayOfMonth: income.dayOfMonth ?? 1,
    };
  });
}

export function UpcomingIncomeCard() {
  const { isReceived, getReceipt, removeReceipt } = useSalary();
  const [openItem, setOpenItem] = useState<PendingItem | null>(null);
  const currentMonth = monthKey();
  const all = getMonthlySalaries();
  const pending = all.filter(
    (item) => !isReceived(item.incomeName, currentMonth),
  );
  const received = all.filter((item) =>
    isReceived(item.incomeName, currentMonth),
  );

  if (pending.length === 0 && received.length === 0) return null;

  return (
    <>
      <div className="space-y-3 rounded-xl border border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-4">
        <div className="flex items-center gap-2">
          <Banknote size={16} className="text-[var(--color-primary)]" />
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
            Bu Ay Maaşlar
          </p>
        </div>

        {pending.length > 0 && (
          <ul className="space-y-2">
            {pending.map((item) => (
              <li
                key={item.incomeName}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.incomeName}</p>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    Ayın {item.dayOfMonth}'i · {item.accountName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--color-primary)]">
                    ~{formatTRY(item.defaultAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenItem(item)}
                    className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Yattı
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {received.length > 0 && (
          <ul className="space-y-1.5 border-t border-[var(--color-primary)]/15 pt-2">
            {received.map((item) => {
              const receipt = getReceipt(item.incomeName, currentMonth);
              const isPre = receipt?.preExisting === true;
              return (
                <li
                  key={item.incomeName}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Check
                      size={14}
                      className="shrink-0 text-[var(--color-success)]"
                    />
                    <p className="truncate text-sm">
                      <span className="font-medium">{item.incomeName}</span>
                      <span className="ml-1 text-[var(--color-muted)]">
                        → {item.accountName}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPre ? (
                      <span className="text-[11px] text-[var(--color-muted)]">
                        yatmış · ödemeler yapıldı
                      </span>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-[var(--color-success)]">
                          {formatTRY(receipt?.amount ?? 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            removeReceipt(item.incomeName, currentMonth)
                          }
                          className="rounded px-1.5 py-0.5 text-[10px] text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                          aria-label="Geri al"
                        >
                          geri al
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {openItem && (
        <SalaryReceivedDialog
          incomeName={openItem.incomeName}
          accountName={openItem.accountName}
          defaultAmount={openItem.defaultAmount}
          open
          onClose={() => setOpenItem(null)}
        />
      )}
    </>
  );
}
