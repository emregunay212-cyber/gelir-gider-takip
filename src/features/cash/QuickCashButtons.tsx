import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { CashEntryDialog } from './CashEntryDialog';
import type { CashEntryDirection } from './CashProvider';

export function QuickCashButtons() {
  const [openDirection, setOpenDirection] = useState<CashEntryDirection | null>(
    null,
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpenDirection('in')}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-3 text-sm font-semibold text-[var(--color-success)] transition-colors hover:bg-[var(--color-success)]/20 active:translate-y-px"
        >
          <ArrowDownCircle className="size-[18px]" />
          Gelen Para
        </button>
        <button
          type="button"
          onClick={() => setOpenDirection('out')}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-3 text-sm font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/20 active:translate-y-px"
        >
          <ArrowUpCircle className="size-[18px]" />
          Giden Para
        </button>
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
