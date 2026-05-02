import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTRY, monthLabel } from '@/lib/format';
import { SEED_INCOMES } from '@/db/seed';
import { UpcomingIncomeCard } from '@/features/income/UpcomingIncomeCard';
import { useIncomeOverrides } from '@/features/income-overrides/IncomeOverridesProvider';
import { SalaryRaiseDialog } from '@/features/income-overrides/SalaryRaiseDialog';

const OWNER_LABEL = { emre: 'Emre', sila: 'Sıla' } as const;
const OWNER_BADGE = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)] border-[var(--color-emre)]/30',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)] border-[var(--color-sila)]/30',
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
        <p className="text-sm text-muted-foreground">
          Maaşlar Dashboard'dan, ek gelirler "Gelen Para" butonuyla işlenir.
        </p>
      </div>

      <UpcomingIncomeCard />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <Card key={income.name}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`px-1.5 py-0 text-[10px] font-medium ${OWNER_BADGE[income.ownerKey]}`}
                        >
                          {OWNER_LABEL[income.ownerKey]}
                        </Badge>
                        <p className="font-medium">{income.name}</p>
                        <Badge
                          variant="outline"
                          className="bg-muted px-1.5 py-0 text-[10px] text-muted-foreground"
                        >
                          {FREQUENCY_LABEL[income.frequency]}
                        </Badge>
                      </div>

                      {income.amountFixed != null && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Sabit · ayın {income.dayOfMonth}'i
                        </p>
                      )}
                      {income.amountMin != null &&
                        income.amountMax != null && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatTRY(income.amountMin)} –{' '}
                            {formatTRY(income.amountMax)}
                            {income.dayOfMonth
                              ? ` · ayın ${income.dayOfMonth}'i`
                              : ''}
                          </p>
                        )}
                      {income.activeMonths && (
                        <ul className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          {income.activeMonths.map((range) => (
                            <li
                              key={`${range.startMonth}-${range.endMonth}`}
                            >
                              {range.startMonth} → {range.endMonth}
                            </li>
                          ))}
                        </ul>
                      )}
                      {income.oneTimeOccurrences && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
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
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {income.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-[var(--color-success)]">
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
                      <p className="text-[11px] text-muted-foreground">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRaiseTarget({
                          name: income.name,
                          currentAmount: override?.amount ?? baseAmount,
                        })
                      }
                      className="mt-2 w-full"
                    >
                      <TrendingUp className="size-3.5" />
                      {override ? 'Zam planını düzenle' : 'Zam planla'}
                    </Button>
                  )}
                </CardContent>
              </Card>
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
