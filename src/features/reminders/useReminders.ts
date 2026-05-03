import { useMemo } from 'react';
import { SEED_INCOMES, SEED_RECURRING_EXPENSES } from '@/db/seed';
import { useSalary } from '@/features/income/SalaryProvider';
import { useBills } from '@/features/bills/BillsProvider';
import { useExpense } from '@/features/expense/ExpenseProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useCustomIncomes } from '@/features/custom-data/CustomIncomesProvider';
import { useToday } from '@/hooks/useToday';
import { monthKey } from '@/lib/format';
import type { SeedIncome } from '@/db/seed';

export type ReminderKind =
  | 'salary_due'
  | 'salary_overdue'
  | 'bill_due_soon'
  | 'bill_overdue'
  | 'limit_warning'
  | 'limit_exceeded';

export type ReminderSeverity = 'info' | 'warning' | 'danger';

export interface Reminder {
  id: string;
  kind: ReminderKind;
  severity: ReminderSeverity;
  title: string;
  message: string;
  amount?: number;
  /** Bu hatırlatmayı kapatmak için ilgili sayfaya yönlendirme. */
  href?: string;
}

const BILL_DUE_SOON_DAYS = 3;
const LIMIT_WARNING_PERCENT = 0.8;

function dayOfToday(todayKey: string): number {
  // todayKey = YYYY-MM-DD
  const day = Number(todayKey.slice(8, 10));
  return Number.isFinite(day) ? day : new Date().getDate();
}

function pickAmount(income: SeedIncome): number {
  return (
    income.amountFixed ??
    (income.amountMin != null && income.amountMax != null
      ? (income.amountMin + income.amountMax) / 2
      : 0)
  );
}

/**
 * Bugün için aksiyon gerektiren hatırlatmaları çıkarır.
 *
 * - **salary_due**: Bugün ayın N'i, maaş tipi gelir, henüz yatmamış
 * - **salary_overdue**: Bekleme günü geçmiş ama hâlâ yatmamış (1 gün tolerans)
 * - **bill_due_soon**: 3 gün içinde fatura ödeme günü, henüz ödenmemiş
 * - **bill_overdue**: Ödeme günü geçmiş ve hâlâ ödenmemiş
 * - **limit_warning**: Bugünkü harcama limit'in %80+'i
 * - **limit_exceeded**: Bugünkü harcama limit'i aştı
 */
export function useReminders(): {
  reminders: readonly Reminder[];
  hasUrgent: boolean;
} {
  const today = useToday();
  const { isReceived } = useSalary();
  const { getAmount, isPaid } = useBills();
  const { todaysTotal } = useExpense();
  const { dailyLimit } = useSettings();
  const { asSeedList: customIncomesAsSeed } = useCustomIncomes();

  return useMemo(() => {
    const reminders: Reminder[] = [];
    const month = monthKey();
    const todayDay = dayOfToday(today);

    // 1) Maaş hatırlatmaları
    const allIncomes = [...SEED_INCOMES, ...customIncomesAsSeed()];
    for (const income of allIncomes) {
      if (income.frequency !== 'monthly' || income.category !== 'salary')
        continue;
      const day = income.dayOfMonth;
      if (day == null) continue;
      if (isReceived(income.name, month)) continue;

      const diff = todayDay - day;
      const amount = pickAmount(income);

      if (diff === 0) {
        reminders.push({
          id: `salary-due-${income.name}`,
          kind: 'salary_due',
          severity: 'info',
          title: '💰 Maaş günü',
          message: `Bugün ${income.name} ödemesi bekleniyor`,
          amount,
          href: '/',
        });
      } else if (diff > 0 && diff <= 5) {
        reminders.push({
          id: `salary-overdue-${income.name}`,
          kind: 'salary_overdue',
          severity: 'warning',
          title: '⏰ Maaş gecikiyor',
          message: `${income.name} ${diff} gün önce yatması gerekiyordu`,
          amount,
          href: '/',
        });
      }
    }

    // 2) Fatura hatırlatmaları
    for (const bill of SEED_RECURRING_EXPENSES) {
      const amount = getAmount(bill.name);
      if (amount === 0) continue; // tutarı henüz girilmemiş, atla
      if (isPaid(bill.name, month)) continue;

      const diff = bill.paymentDayOfMonth - todayDay;
      if (diff < 0) {
        reminders.push({
          id: `bill-overdue-${bill.name}`,
          kind: 'bill_overdue',
          severity: 'danger',
          title: '🔴 Fatura gecikti',
          message: `${bill.name} (${Math.abs(diff)} gün gecikmeli)`,
          amount,
          href: '/faturalar',
        });
      } else if (diff <= BILL_DUE_SOON_DAYS) {
        reminders.push({
          id: `bill-soon-${bill.name}`,
          kind: 'bill_due_soon',
          severity: diff === 0 ? 'warning' : 'info',
          title: diff === 0 ? '🟡 Fatura bugün' : '📅 Fatura yaklaşıyor',
          message:
            diff === 0
              ? `${bill.name} bugün ödenmeli`
              : `${bill.name} ${diff} gün sonra ödenmeli`,
          amount,
          href: '/faturalar',
        });
      }
    }

    // 3) Günlük limit uyarıları
    const spent = todaysTotal();
    if (spent > dailyLimit) {
      reminders.push({
        id: 'limit-exceeded',
        kind: 'limit_exceeded',
        severity: 'danger',
        title: '🚨 Limit aşıldı',
        message: `Bugün ${Math.round(spent - dailyLimit)} TL aşım`,
        amount: spent - dailyLimit,
        href: '/',
      });
    } else if (spent >= dailyLimit * LIMIT_WARNING_PERCENT) {
      const remaining = dailyLimit - spent;
      reminders.push({
        id: 'limit-warning',
        kind: 'limit_warning',
        severity: 'warning',
        title: '⚠️ Limit yaklaşıyor',
        message: `Bugün için sadece ${Math.round(remaining)} TL kaldı`,
        amount: remaining,
        href: '/',
      });
    }

    const hasUrgent = reminders.some((r) => r.severity === 'danger');

    return { reminders, hasUrgent };
  }, [
    today,
    isReceived,
    getAmount,
    isPaid,
    todaysTotal,
    dailyLimit,
    customIncomesAsSeed,
  ]);
}
