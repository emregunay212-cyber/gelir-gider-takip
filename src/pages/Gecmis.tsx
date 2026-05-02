import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  formatTRY,
  monthKey,
  monthLabel,
  addMonth,
  getDaysInMonth,
  dayLabel,
} from '../lib/format';
import { SEED_HOUSEHOLD } from '../db/seed';
import type { ExpenseCategory } from '../types';
import {
  useExpense,
  type ExpenseEntry,
  type ExpenseSpender,
} from '../features/expense/ExpenseProvider';

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

const SPENDER_BADGE: Record<ExpenseSpender, string> = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)]',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)]',
};

interface CategoryStat {
  category: ExpenseCategory;
  amount: number;
  count: number;
  percent: number;
}

interface DayGroup {
  date: string;
  total: number;
  expenses: ExpenseEntry[];
}

export default function Gecmis() {
  const { entries, monthlyTotal, removeExpense } = useExpense();
  const [month, setMonth] = useState<string>(() => monthKey());

  const inMonth = useMemo(
    () => entries.filter((e) => e.date.startsWith(month)),
    [entries, month],
  );

  const total = monthlyTotal(month);
  const daysInMonth = getDaysInMonth(month);
  const monthlyBudget = SEED_HOUSEHOLD.defaultDailyLimit * daysInMonth;
  const overBudget = total - monthlyBudget;

  const categoryStats: CategoryStat[] = useMemo(() => {
    const byCat = new Map<ExpenseCategory, { amount: number; count: number }>();
    inMonth.forEach((e) => {
      const cur = byCat.get(e.category) ?? { amount: 0, count: 0 };
      byCat.set(e.category, {
        amount: cur.amount + e.amount,
        count: cur.count + 1,
      });
    });
    const list: CategoryStat[] = [];
    byCat.forEach((value, category) => {
      list.push({
        category,
        amount: value.amount,
        count: value.count,
        percent: total > 0 ? (value.amount / total) * 100 : 0,
      });
    });
    return list.sort((a, b) => b.amount - a.amount);
  }, [inMonth, total]);

  const spenderTotals = useMemo(() => {
    const byUser: Record<ExpenseSpender, number> = { emre: 0, sila: 0 };
    inMonth.forEach((e) => {
      byUser[e.spender] += e.amount;
    });
    return byUser;
  }, [inMonth]);

  const dayGroups: DayGroup[] = useMemo(() => {
    const map = new Map<string, ExpenseEntry[]>();
    inMonth.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return Array.from(map.entries())
      .map(([date, list]) => ({
        date,
        total: list.reduce((s, e) => s + e.amount, 0),
        expenses: [...list].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [inMonth]);

  return (
    <section className="space-y-4">
      {/* Ay seçici */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <button
          type="button"
          onClick={() => setMonth(addMonth(month, -1))}
          className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          aria-label="Önceki ay"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-base font-semibold">{monthLabel(month)}</p>
        <button
          type="button"
          onClick={() => setMonth(addMonth(month, 1))}
          className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]"
          aria-label="Sonraki ay"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Aylık özet */}
      <div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-indigo-600 p-5 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          Bu Ay Toplam Harcama
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {formatTRY(total)}
        </p>
        <p className="mt-1 text-xs opacity-80">
          {formatTRY(monthlyBudget)} aylık bütçe ·{' '}
          {overBudget > 0 ? (
            <span className="font-semibold text-red-100">
              +{formatTRY(overBudget)} aşım
            </span>
          ) : (
            <span className="font-semibold text-emerald-100">
              {formatTRY(-overBudget)} altında
            </span>
          )}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className={`h-full transition-all ${
              overBudget > 0 ? 'bg-red-300' : 'bg-white/90'
            }`}
            style={{
              width: `${Math.min(100, (total / monthlyBudget) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Kim daha çok harcadı */}
      {(spenderTotals.emre > 0 || spenderTotals.sila > 0) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Kim Daha Çok Harcadı
          </p>
          <SpenderBars
            emre={spenderTotals.emre}
            sila={spenderTotals.sila}
          />
        </div>
      )}

      {/* Kategori dağılımı */}
      {categoryStats.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Kategori Dağılımı
          </p>
          <ul className="mt-2 space-y-2">
            {categoryStats.map((stat) => (
              <li key={stat.category} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{CATEGORY_EMOJI[stat.category]}</span>
                    <span className="truncate font-medium">
                      {CATEGORY_LABEL[stat.category]}
                    </span>
                    <span className="text-[11px] text-[var(--color-muted)]">
                      {stat.count} adet
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatTRY(stat.amount)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="h-full bg-[var(--color-primary)]"
                    style={{ width: `${stat.percent}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Günlük gruplandırılmış liste */}
      {dayGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-center text-sm text-[var(--color-muted)]">
          {monthLabel(month)} için henüz harcama yok.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Günlük Detay · {dayGroups.length} gün
          </p>
          {dayGroups.map((group) => (
            <div key={group.date} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-sm font-semibold">{dayLabel(group.date)}</p>
                <p className="text-sm font-semibold tabular-nums text-[var(--color-danger)]">
                  −{formatTRY(group.total)}
                </p>
              </div>
              <ul className="space-y-1.5">
                {group.expenses.map((expense) => (
                  <li
                    key={expense.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="text-lg" aria-hidden>
                        {CATEGORY_EMOJI[expense.category]}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SPENDER_BADGE[expense.spender]}`}
                          >
                            {expense.spender === 'emre' ? 'Emre' : 'Sıla'}
                          </span>
                          <p className="truncate text-sm font-medium">
                            {CATEGORY_LABEL[expense.category]}
                            {expense.description && (
                              <span className="ml-1 font-normal text-[var(--color-muted)]">
                                · {expense.description}
                              </span>
                            )}
                          </p>
                        </div>
                        {expense.accountName && (
                          <p className="text-[11px] text-[var(--color-muted)]">
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
                        className="rounded p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface SpenderBarsProps {
  emre: number;
  sila: number;
}

function SpenderBars({ emre, sila }: SpenderBarsProps) {
  const total = emre + sila;
  if (total === 0) return null;
  const emrePercent = (emre / total) * 100;
  const silaPercent = (sila / total) * 100;
  return (
    <div className="mt-2 space-y-2">
      <SpenderRow
        label="Emre"
        amount={emre}
        percent={emrePercent}
        color="bg-[var(--color-emre)]"
      />
      <SpenderRow
        label="Sıla"
        amount={sila}
        percent={silaPercent}
        color="bg-[var(--color-sila)]"
      />
    </div>
  );
}

interface SpenderRowProps {
  label: string;
  amount: number;
  percent: number;
  color: string;
}

function SpenderRow({ label, amount, percent, color }: SpenderRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold tabular-nums">{formatTRY(amount)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
