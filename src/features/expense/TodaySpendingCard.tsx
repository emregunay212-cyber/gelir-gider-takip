import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExpense } from './ExpenseProvider';
import { AddExpenseDialog } from './AddExpenseDialog';
import { SEED_HOUSEHOLD } from '@/db/seed';
import { formatTRY } from '@/lib/format';

export function TodaySpendingCard() {
  const { todaysTotal } = useExpense();
  const [open, setOpen] = useState(false);

  const limit = SEED_HOUSEHOLD.defaultDailyLimit;
  const spent = todaysTotal();
  const remaining = limit - spent;
  const percent = Math.min(100, Math.max(0, (spent / limit) * 100));
  const isOver = remaining < 0;

  const remainingTone = isOver
    ? 'text-red-100'
    : remaining > limit * 0.5
      ? 'text-emerald-100'
      : remaining > limit * 0.2
        ? 'text-amber-100'
        : 'text-orange-100';

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 text-white shadow-lg ring-1 ring-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          Bugün Kalan Limit
        </p>
        <p className={`mt-1 text-4xl font-bold tabular-nums ${remainingTone}`}>
          {formatTRY(remaining)}
        </p>
        <p className="mt-1 text-xs opacity-80">
          {formatTRY(spent)} harcandı / {formatTRY(limit)} bugünün limiti
          {isOver && (
            <span className="ml-1 font-semibold text-red-100">
              · {formatTRY(Math.abs(remaining))} aşım!
            </span>
          )}
        </p>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className={`h-full transition-all ${
              isOver ? 'bg-red-300' : 'bg-white/90'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <Button
          type="button"
          onClick={() => setOpen(true)}
          size="lg"
          className="mt-5 w-full bg-white py-6 text-base font-bold text-indigo-700 shadow-md hover:bg-white/95"
        >
          <Plus className="size-5" strokeWidth={2.6} />
          Harcama Ekle
        </Button>
      </div>

      <AddExpenseDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
