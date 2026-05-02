import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useExpense } from './ExpenseProvider';
import { AddExpenseDialog } from './AddExpenseDialog';
import { SEED_HOUSEHOLD } from '@/db/seed';
import { formatTRY } from '@/lib/format';
import { CountUp } from '@/components/AnimatedNumber';

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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 p-5 text-white shadow-lg ring-1 ring-white/10"
      >
        <motion.div
          aria-hidden
          className="absolute -right-16 -top-16 size-48 rounded-full bg-white/10 blur-2xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-20 -left-12 size-56 rounded-full bg-violet-400/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
            Bugün Kalan Limit
          </p>
          <p className={`mt-1 text-4xl font-bold tabular-nums ${remainingTone}`}>
            <CountUp value={remaining} format={(n) => formatTRY(n)} />
          </p>
          <p className="mt-1 text-xs opacity-80">
            <CountUp value={spent} format={(n) => formatTRY(n)} /> harcandı /{' '}
            {formatTRY(limit)} bugünün limiti
            {isOver && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="ml-1 font-semibold text-red-100"
              >
                · {formatTRY(Math.abs(remaining))} aşım!
              </motion.span>
            )}
          </p>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <motion.div
              className={`h-full ${isOver ? 'bg-red-300' : 'bg-white/90'}`}
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-4 text-base font-bold text-indigo-700 shadow-md hover:shadow-xl"
          >
            <Plus className="size-5" strokeWidth={2.6} />
            Harcama Ekle
          </motion.button>
        </div>
      </motion.div>

      <AddExpenseDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
