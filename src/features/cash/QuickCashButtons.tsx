import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { CashEntryDialog } from './CashEntryDialog';
import type { CashEntryDirection } from './CashProvider';

export function QuickCashButtons() {
  const [openDirection, setOpenDirection] = useState<CashEntryDirection | null>(
    null,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          type="button"
          onClick={() => setOpenDirection('in')}
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-3 text-sm font-semibold text-[var(--color-success)] shadow-sm shadow-emerald-500/5 hover:bg-[var(--color-success)]/20 hover:shadow-emerald-500/20"
        >
          <ArrowDownCircle className="size-[18px]" />
          Gelen Para
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setOpenDirection('out')}
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-3 text-sm font-semibold text-[var(--color-danger)] shadow-sm shadow-rose-500/5 hover:bg-[var(--color-danger)]/20 hover:shadow-rose-500/20"
        >
          <ArrowUpCircle className="size-[18px]" />
          Giden Para
        </motion.button>
      </div>

      {openDirection && (
        <CashEntryDialog
          direction={openDirection}
          open
          onClose={() => setOpenDirection(null)}
        />
      )}
    </>
  );
}
