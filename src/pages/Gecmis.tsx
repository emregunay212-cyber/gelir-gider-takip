import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddExpenseDialog } from '@/features/expense/AddExpenseDialog';
import {
  formatTRY,
  monthKey,
  monthLabel,
  addMonth,
  getDaysInMonth,
  dayLabel,
} from '@/lib/format';
import { SEED_HOUSEHOLD } from '@/db/seed';
import type { ExpenseCategory } from '@/types';
import {
  useExpense,
  type ExpenseEntry,
  type ExpenseSpender,
} from '@/features/expense/ExpenseProvider';

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
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)] border-[var(--color-emre)]/30',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)] border-[var(--color-sila)]/30',
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

export default function Gecmis() {
  const { entries, monthlyTotal, monthlySavings, removeExpense } = useExpense();
  const [month, setMonth] = useState<string>(() => monthKey());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);

  const inMonth = useMemo(
    () => entries.filter((e) => e.date.startsWith(month)),
    [entries, month],
  );

  const total = monthlyTotal(month);
  const dailyLimit = SEED_HOUSEHOLD.defaultDailyLimit;
  const totalDaysInMonth = getDaysInMonth(month);
  const currentMonth = monthKey();

  // Bu ay seçiliyse geçen gün sayısına göre, geçmiş ay ise tüm ay × limit
  const effectiveDays =
    month === currentMonth
      ? new Date().getDate()
      : month < currentMonth
        ? totalDaysInMonth
        : 0;
  const monthlyBudget = dailyLimit * effectiveDays;
  // monthlySavings = monthlyBudget − total → pozitif ise tasarruf, negatif aşım
  const savings = monthlySavings(month, dailyLimit);
  const overBudget = -savings;

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
      <Card>
        <CardContent className="flex items-center justify-between gap-2 p-3">
          <button
            type="button"
            onClick={() => setMonth(addMonth(month, -1))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="size-[18px]" />
          </button>
          <p className="text-base font-semibold">{monthLabel(month)}</p>
          <button
            type="button"
            onClick={() => setMonth(addMonth(month, 1))}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="size-[18px]" />
          </button>
        </CardContent>
      </Card>

      {/* Aylık özet — toplam harcama + tasarruf */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 text-white shadow-lg ring-1 ring-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
          Bu Ay Toplam Harcama
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {formatTRY(total)}
        </p>
        <p className="mt-1 text-xs opacity-80">
          {effectiveDays} gün × {formatTRY(dailyLimit)} ={' '}
          {formatTRY(monthlyBudget)}
          {effectiveDays > 0 && (
            <>
              {' · '}
              {overBudget > 0 ? (
                <span className="font-semibold text-red-100">
                  +{formatTRY(overBudget)} aşım
                </span>
              ) : (
                <span className="font-semibold text-emerald-100">
                  {formatTRY(savings)} altında
                </span>
              )}
            </>
          )}
        </p>
        {effectiveDays > 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className={`h-full transition-all ${
                overBudget > 0 ? 'bg-red-300' : 'bg-white/90'
              }`}
              style={{
                width: `${Math.min(100, (total / Math.max(monthlyBudget, 1)) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Tasarruf detay kartı — günlük kırılım */}
      {effectiveDays > 0 && (
        <Card
          className={
            savings >= 0
              ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
              : 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5'
          }
        >
          <CardContent className="p-4">
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide ${
                savings >= 0
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-danger)]'
              }`}
            >
              {savings >= 0 ? 'Bu Ayın Tasarrufu' : 'Bu Ayın Aşımı'}
            </p>
            <p
              className={`mt-1 text-2xl font-bold tabular-nums ${
                savings >= 0
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-danger)]'
              }`}
            >
              {savings >= 0 ? '+' : ''}
              {formatTRY(savings)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {effectiveDays} gün · günlük {formatTRY(dailyLimit)} limit ·
              ortalama {formatTRY(total / effectiveDays)} harcandı
            </p>
          </CardContent>
        </Card>
      )}

      {(spenderTotals.emre > 0 || spenderTotals.sila > 0) && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kim Daha Çok Harcadı
            </p>
            <SpenderBars
              emre={spenderTotals.emre}
              sila={spenderTotals.sila}
            />
          </CardContent>
        </Card>
      )}

      {categoryStats.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                      <span className="text-[11px] text-muted-foreground">
                        {stat.count} adet
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatTRY(stat.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {dayGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          {monthLabel(month)} için henüz harcama yok.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                {group.expenses.map((expense) => {
                  const isExpanded = expandedId === expense.id;
                  const time = formatTime(expense.createdAt);
                  return (
                    <Card key={expense.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex items-start justify-between gap-2 px-3 py-2.5">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-0.5 text-lg" aria-hidden>
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
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : expense.id)
                            }
                            aria-label={
                              isExpanded ? 'Detayı kapat' : 'Detayı göster'
                            }
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
                                  value={
                                    expense.spender === 'emre' ? 'Emre' : 'Sıla'
                                  }
                                />
                                {expense.accountName && (
                                  <DetailRow
                                    label="🏦 Hesap"
                                    value={expense.accountName}
                                  />
                                )}
                                {time && (
                                  <DetailRow label="🕒 Saat" value={time} />
                                )}
                                <div className="flex justify-end gap-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditing(expense);
                                      setExpandedId(null);
                                    }}
                                    aria-label="Düzenle"
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                                  >
                                    <Pencil className="size-3" />
                                    Düzenle
                                  </button>
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
                      </CardContent>
                    </Card>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AddExpenseDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        editingExpense={editing ?? undefined}
      />
    </section>
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
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
