import { formatTRY, monthKey } from '../lib/format';
import {
  SEED_ACCOUNTS,
  SEED_DEBTS,
  SEED_HOUSEHOLD,
  SEED_INCOMES,
} from '../db/seed';
import { useSalary } from '../features/income/SalaryProvider';
import { UpcomingIncomeCard } from '../features/income/UpcomingIncomeCard';
import { useCash } from '../features/cash/CashProvider';
import { QuickCashButtons } from '../features/cash/QuickCashButtons';
import { useExpense } from '../features/expense/ExpenseProvider';
import { TodaySpendingCard } from '../features/expense/TodaySpendingCard';
import { TodayExpensesList } from '../features/expense/TodayExpensesList';
import { useBills } from '../features/bills/BillsProvider';
import { useDebtPayment } from '../features/debt/DebtPaymentProvider';
import { useIncomeOverrides } from '../features/income-overrides/IncomeOverridesProvider';

function sumAccountBalances(): number {
  return SEED_ACCOUNTS.filter((a) => a.type !== 'virtual_kasa').reduce(
    (acc, a) => acc + a.balance,
    0,
  );
}

function sumMonthlyDebtsActive(closedSet: Set<string>): number {
  return SEED_DEBTS.filter(
    (d) => !d.isPaidOff && !closedSet.has(d.name),
  ).reduce((acc, d) => acc + d.monthlyPayment, 0);
}

function estimatedMonthlyIncome(
  resolveAmount: (name: string, base: number, month: string) => number,
  currentMonth: string,
): number {
  return SEED_INCOMES.reduce((acc, income) => {
    const base =
      income.amountFixed ??
      (income.amountMin != null && income.amountMax != null
        ? (income.amountMin + income.amountMax) / 2
        : 0);

    if (income.frequency === 'monthly') {
      return acc + resolveAmount(income.name, base, currentMonth);
    }

    if (income.frequency === 'seasonal_range' && income.activeMonths) {
      const active = income.activeMonths.some(
        (r) => currentMonth >= r.startMonth && currentMonth <= r.endMonth,
      );
      if (active) return acc + resolveAmount(income.name, base, currentMonth);
    }

    return acc;
  }, 0);
}

export default function Dashboard() {
  const { totalDelta: salaryDelta } = useSalary();
  const { totalDelta: cashDelta } = useCash();
  const { totalDelta: expenseDelta, monthlyTotal: expenseMonthly } = useExpense();
  const { monthlyTotal: billsMonthly } = useBills();
  const { totalDelta: debtPaidDelta, isClosedByPayments } = useDebtPayment();
  const { resolveAmount } = useIncomeOverrides();

  const dailyLimit = SEED_HOUSEHOLD.defaultDailyLimit;
  const totalCash =
    sumAccountBalances() +
    salaryDelta() +
    cashDelta() -
    expenseDelta() -
    debtPaidDelta();

  const closedSet = new Set(
    SEED_DEBTS.filter((d) => isClosedByPayments(d.name)).map((d) => d.name),
  );
  const monthlyDebts = sumMonthlyDebtsActive(closedSet);
  const monthlyBills = billsMonthly();
  const monthlyIncome = estimatedMonthlyIncome(resolveAmount, monthKey());
  const monthlyDailyBudget = dailyLimit * 30;
  const projectedSurplus =
    monthlyIncome - monthlyDebts - monthlyBills - monthlyDailyBudget;

  const thisMonthSpent = expenseMonthly(monthKey());

  return (
    <section className="space-y-4">
      {/* 1. EN KRİTİK: Bugünün limiti + Harcama Ekle butonu */}
      <TodaySpendingCard />

      {/* 2. Bugünkü harcamalar listesi */}
      <TodayExpensesList />

      {/* 3. Kasa (toplam param) */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Kasa (toplam param)
        </p>
        <p className="mt-1 text-3xl font-bold text-[var(--color-text)]">
          {formatTRY(totalCash)}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Tüm banka hesapları + evdeki nakit
        </p>
      </div>

      {/* 4. Hızlı kasa hareketi */}
      <QuickCashButtons />

      {/* 5. Yaklaşan gelir (maaşlar) */}
      <UpcomingIncomeCard />

      {/* 6. Aylık özet stat'ları */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Bu Ay Harcanan" value={formatTRY(thisMonthSpent)} tone="danger" />
        <Stat label="Bu Ayın Tasarrufu" value={formatTRY(0)} muted />
        <Stat
          label="Aylık Borç"
          value={formatTRY(monthlyDebts)}
          tone="danger"
        />
        <Stat
          label="Aylık Gelir (ort.)"
          value={formatTRY(monthlyIncome)}
          tone="success"
        />
      </div>

      {/* 7. Aylık projeksiyon */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Aylık Projeksiyon (Ortalama)
        </p>
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Gelir" value={monthlyIncome} positive />
          <Row label="Borç ödemeleri" value={-monthlyDebts} />
          <Row label="Faturalar" value={-monthlyBills} />
          <Row
            label={`Günlük harcama (${formatTRY(dailyLimit)} × 30)`}
            value={-monthlyDailyBudget}
          />
          <hr className="my-2 border-[var(--color-border)]" />
          <Row
            label="Beklenen aylık tasarruf"
            value={projectedSurplus}
            positive={projectedSurplus >= 0}
            bold
          />
        </div>
      </div>
    </section>
  );
}

interface StatProps {
  label: string;
  value: string;
  muted?: boolean;
  tone?: 'success' | 'danger';
}

function Stat({ label, value, muted, tone }: StatProps) {
  const toneClass =
    tone === 'success'
      ? 'text-[var(--color-success)]'
      : tone === 'danger'
        ? 'text-[var(--color-danger)]'
        : muted
          ? 'text-[var(--color-muted)]'
          : 'text-[var(--color-text)]';

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

interface RowProps {
  label: string;
  value: number;
  positive?: boolean;
  bold?: boolean;
}

function Row({ label, value, positive, bold }: RowProps) {
  const isPositive = positive ?? value >= 0;
  const valueColor = isPositive
    ? 'text-[var(--color-success)]'
    : 'text-[var(--color-danger)]';
  const weight = bold ? 'font-semibold' : '';
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[var(--color-muted)] ${weight}`}>{label}</span>
      <span className={`${valueColor} ${weight}`}>
        {value >= 0 ? '+' : ''}
        {formatTRY(value)}
      </span>
    </div>
  );
}
