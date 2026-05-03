import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { useExpense } from '@/features/expense/ExpenseProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import {
  formatTRY,
  monthKey,
  monthLabel,
  addMonth,
  getDaysInMonth,
} from '@/lib/format';

interface MonthBar {
  month: string; // YYYY-MM
  label: string;
  total: number;
  budget: number;
  isCurrent: boolean;
}

interface Props {
  /** Kaç ay göster (default: 6) */
  monthsBack?: number;
  /** Tıklanırsa o ay seçili hale gelir. */
  onMonthSelect?: (month: string) => void;
  /** Şu anda seçili ay (vurgulamak için). */
  selectedMonth?: string;
}

/**
 * Son N ayın harcama toplamı + bütçe çubuğu.
 * Her ay için iki çubuk: gerçek harcama + (gri arka plan) o ayın bütçesi.
 */
export function MonthlyComparisonChart({
  monthsBack = 6,
  onMonthSelect,
  selectedMonth,
}: Props) {
  const { monthlyTotal } = useExpense();
  const { dailyLimit } = useSettings();

  const months: MonthBar[] = useMemo(() => {
    const current = monthKey();
    const list: MonthBar[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const m = addMonth(current, -i);
      const days = getDaysInMonth(m);
      list.push({
        month: m,
        label: monthLabel(m),
        total: monthlyTotal(m),
        budget: dailyLimit * days,
        isCurrent: m === current,
      });
    }
    return list;
  }, [monthsBack, monthlyTotal, dailyLimit]);

  const maxValue = Math.max(
    ...months.map((m) => Math.max(m.total, m.budget)),
    1,
  );

  if (months.every((m) => m.total === 0)) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-3">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Son {monthsBack} Ay Karşılaştırma
        </p>

        <div className="space-y-2.5">
          {months.map((m, index) => {
            const totalPercent = (m.total / maxValue) * 100;
            const budgetPercent = (m.budget / maxValue) * 100;
            const overBudget = m.total > m.budget;
            const isSelected = m.month === selectedMonth;

            return (
              <button
                key={m.month}
                type="button"
                onClick={() => onMonthSelect?.(m.month)}
                className={`block w-full rounded-lg border px-2 py-1.5 text-left transition-colors ${
                  isSelected
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-transparent hover:bg-muted/40'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`font-medium ${
                      m.isCurrent ? 'text-primary' : ''
                    }`}
                  >
                    {m.label}
                    {m.isCurrent && (
                      <span className="ml-1 text-[10px] text-primary/80">
                        · bu ay
                      </span>
                    )}
                  </span>
                  <span
                    className={`tabular-nums font-semibold ${
                      overBudget
                        ? 'text-[var(--color-danger)]'
                        : 'text-foreground'
                    }`}
                  >
                    {formatTRY(m.total)}
                  </span>
                </div>
                {/* Bütçe çubuğu (arka plan) */}
                <div className="relative h-2 overflow-hidden rounded-full bg-muted/40">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-muted-foreground/15"
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetPercent}%` }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                  <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      overBudget
                        ? 'bg-[var(--color-danger)]'
                        : m.isCurrent
                          ? 'bg-primary'
                          : 'bg-foreground/70'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${totalPercent}%` }}
                    transition={{
                      duration: 0.7,
                      delay: 0.15 + index * 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-muted-foreground/30" />
            Bütçe
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-foreground/70" />
            Gerçek harcama
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-[var(--color-danger)]" />
            Aşım
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
