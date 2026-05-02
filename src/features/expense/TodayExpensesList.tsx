import { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { useExpense } from './ExpenseProvider';
import { formatTRY } from '@/lib/format';
import type { ExpenseCategory } from '@/types';

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  food: 'Yemek',
  grocery: 'Market',
  fuel: 'Yakıt',
  transport: 'Ulaşım',
  health: 'Sağlık',
  clothing: 'Giyim',
  entertainment: 'Eğlence',
  cigarette: 'Sigara',
  bill: 'Fatura',
  other: 'Diğer',
};

const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  food: '🍔',
  grocery: '🛒',
  fuel: '⛽',
  transport: '🚌',
  health: '💊',
  clothing: '👕',
  entertainment: '🎬',
  cigarette: '🚬',
  bill: '📄',
  other: '📋',
};

const SPENDER_BADGE: Record<'emre' | 'sila', string> = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)] border-[var(--color-emre)]/30',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)] border-[var(--color-sila)]/30',
};

const TIME_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
});

function formatTime(iso: string): string {
  try {
    return TIME_FORMATTER.format(new Date(iso));
  } catch {
    return '';
  }
}

export function TodayExpensesList() {
  const { todaysExpenses, removeExpense } = useExpense();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = [...todaysExpenses()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        👍 Henüz bugün harcama yok
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Bugünkü Harcamalar · {items.length} adet
      </p>
      <ul className="space-y-1.5">
        {items.map((expense) => {
          const isExpanded = expandedId === expense.id;
          const time = formatTime(expense.createdAt);

          return (
            <li
              key={expense.id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 text-xl" aria-hidden>
                    {CATEGORY_EMOJI[expense.category]}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`px-1.5 py-0 text-[10px] font-medium ${SPENDER_BADGE[expense.spender]}`}
                      >
                        {expense.spender === 'emre' ? 'Emre' : 'Sıla'}
                      </Badge>
                      <p
                        className={`text-sm font-medium ${isExpanded ? 'break-words' : 'truncate'}`}
                      >
                        {CATEGORY_LABEL[expense.category]}
                        {expense.description && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            · {expense.description}
                          </span>
                        )}
                      </p>
                    </div>
                    {expense.accountName && !isExpanded && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {expense.accountName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : expense.id)
                    }
                    aria-label={isExpanded ? 'Detayı kapat' : 'Detayı göster'}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-base font-semibold tabular-nums text-[var(--color-danger)] transition-colors hover:bg-muted"
                  >
                    −{formatTRY(expense.amount)}
                    <motion.span
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-muted-foreground"
                    >
                      <ChevronDown className="size-3.5" />
                    </motion.span>
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 border-t border-border bg-muted/20 px-3 py-2.5 text-[11px]">
                      {expense.description && (
                        <DetailRow
                          label="📝 Açıklama"
                          value={expense.description}
                        />
                      )}
                      <DetailRow
                        label="🏷 Kategori"
                        value={CATEGORY_LABEL[expense.category]}
                      />
                      <DetailRow
                        label="👤 Kim"
                        value={expense.spender === 'emre' ? 'Emre' : 'Sıla'}
                      />
                      {expense.accountName && (
                        <DetailRow
                          label="🏦 Hesap"
                          value={expense.accountName}
                        />
                      )}
                      {time && <DetailRow label="🕒 Saat" value={time} />}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => removeExpense(expense.id)}
                          aria-label="Harcamayı sil"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--color-danger)]"
                        >
                          <Trash2 className="size-3" />
                          Sil
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}
