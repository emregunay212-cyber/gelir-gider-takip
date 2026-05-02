import { Trash2 } from 'lucide-react';
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

export function TodayExpensesList() {
  const { todaysExpenses, removeExpense } = useExpense();
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
        {items.map((expense) => (
          <li
            key={expense.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="text-xl" aria-hidden>
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
                  <p className="truncate text-sm font-medium">
                    {CATEGORY_LABEL[expense.category]}
                    {expense.description && (
                      <span className="ml-1 font-normal text-muted-foreground">
                        · {expense.description}
                      </span>
                    )}
                  </p>
                </div>
                {expense.accountName && (
                  <p className="text-[11px] text-muted-foreground">
                    {expense.accountName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums text-[var(--color-danger)]">
                −{formatTRY(expense.amount)}
              </span>
              <button
                type="button"
                onClick={() => removeExpense(expense.id)}
                aria-label="Sil"
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--color-danger)]"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
