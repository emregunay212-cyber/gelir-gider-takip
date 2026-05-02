import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatTRY, monthLabel } from '../lib/format';
import { SEED_INCOMES } from '../db/seed';
import { UpcomingIncomeCard } from '../features/income/UpcomingIncomeCard';
import { useIncomeOverrides } from '../features/income-overrides/IncomeOverridesProvider';
import { SalaryRaiseDialog } from '../features/income-overrides/SalaryRaiseDialog';

const OWNER_LABEL = { emre: 'Emre', sila: 'Sıla' } as const;
const OWNER_COLOR = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)]',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)]',
} as const;

const FREQUENCY_LABEL = {
  monthly: 'Aylık düzenli',
  seasonal_range: 'Dönemsel',
  one_time: 'Tek seferlik',
} as const;

export default function Gelirler() {
  const { overrides } = useIncomeOverrides();
  const [raiseTarget, setRaiseTarget] = useState<{
    name: string;
    currentAmount: number;
  } | null>(null);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Gelirler</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Maaşlar Dashboard'dan, ek gelirler "Gelen Para" butonuyla işlenir.
        </p>
      </div>

      {/* Aylık maaşlar — UpcomingIncomeCard reuse */}
      <UpcomingIncomeCard />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Tüm Gelir Kaynakları
        </p>
        <ul className="space-y-2">
          {SEED_INCOMES.map((income) => {
            const override = overrides[income.name];
            const baseAmount =
              income.amountFixed ??
              (income.amountMin != null && income.amountMax != null
                ? (income.amountMin + income.amountMax) / 2
                : 0);
            return (
            <li
              key={income.name}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${OWNER_COLOR[income.ownerKey]}`}
                    >
                      {OWNER_LABEL[income.ownerKey]}
                    </span>
                    <p className="font-medium">{income.name}</p>
                    <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]">
                      {FREQUENCY_LABEL[income.frequency]}
                    </span>
                  </div>

                  {income.amountFixed != null && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      Sabit · ayın {income.dayOfMonth}'i
                    </p>
                  )}
                  {income.amountMin != null && income.amountMax != null && (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {formatTRY(income.amountMin)} – {formatTRY(income.amountMax)}
                      {income.dayOfMonth ? ` · ayın ${income.dayOfMonth}'i` : ''}
                    </p>
                  )}
                  {income.activeMonths && (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--color-muted)]">
                      {income.activeMonths.map((range) => (
                        <li key={`${range.startMonth}-${range.endMonth}`}>
                          {range.startMonth} → {range.endMonth}
                        </li>
                      ))}
                    </ul>
                  )}
                  {income.oneTimeOccurrences && (
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                      {income.oneTimeOccurrences.length} adet ·{' '}
                      {formatTRY(
                        income.oneTimeOccurrences.reduce(
                          (s, o) => s + o.amount,
                          0,
                        ),
                      )}{' '}
                      toplam · gelince "+ Gelen Para" ile gir
                    </p>
                  )}
                  {income.notes && (
                    <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                      {income.notes}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-semibold text-[var(--color-success)]">
                    {income.amountFixed != null
                      ? formatTRY(income.amountFixed)
                      : income.amountMin != null && income.amountMax != null
                        ? `~${formatTRY(
                            (income.amountMin + income.amountMax) / 2,
                          )}`
                        : income.oneTimeOccurrences
                          ? formatTRY(
                              income.oneTimeOccurrences[0]?.amount ?? 0,
                            )
                          : '—'}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)]">
                    {income.frequency === 'one_time' ? '/ adet' : '/ ay'}
                  </p>
                </div>
              </div>

              {override && (
                <div className="mt-2 rounded-lg bg-[var(--color-success)]/10 px-3 py-2 text-xs text-[var(--color-success)]">
                  📈 {monthLabel(override.effectiveFrom)}'dan itibaren{' '}
                  <strong>{formatTRY(override.amount)}</strong>
                </div>
              )}

              {income.frequency === 'monthly' && baseAmount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setRaiseTarget({
                      name: income.name,
                      currentAmount: override?.amount ?? baseAmount,
                    })
                  }
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-2)]"
                >
                  <TrendingUp size={14} />
                  {override ? 'Zam planını düzenle' : 'Zam planla'}
                </button>
              )}
            </li>
            );
          })}
        </ul>
      </div>

      {raiseTarget && (
        <SalaryRaiseDialog
          incomeName={raiseTarget.name}
          currentAmount={raiseTarget.currentAmount}
          open
          onClose={() => setRaiseTarget(null)}
        />
      )}
    </section>
  );
}
