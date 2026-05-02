import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatTRY, monthKey } from '@/lib/format';
import {
  SEED_ACCOUNTS,
  SEED_DEBTS,
  SEED_HOUSEHOLD,
  SEED_INCOMES,
} from '@/db/seed';
import { useSalary } from '@/features/income/SalaryProvider';
import { UpcomingIncomeCard } from '@/features/income/UpcomingIncomeCard';
import { useCash } from '@/features/cash/CashProvider';
import { QuickCashButtons } from '@/features/cash/QuickCashButtons';
import { useExpense } from '@/features/expense/ExpenseProvider';
import { TodaySpendingCard } from '@/features/expense/TodaySpendingCard';
import { TodayExpensesList } from '@/features/expense/TodayExpensesList';
import { useBills } from '@/features/bills/BillsProvider';
import { useDebtPayment } from '@/features/debt/DebtPaymentProvider';
import { useIncomeOverrides } from '@/features/income-overrides/IncomeOverridesProvider';

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
      <Card>
        <CardContent className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Kasa (toplam param)
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {formatTRY(totalCash)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tüm banka hesapları + evdeki nakit
          </p>
        </CardContent>
      </Card>

      {/* 4. Hızlı kasa hareketi */}
      <QuickCashButtons />

      {/* 5. Yaklaşan gelir (maaşlar) */}
      <UpcomingIncomeCard />

      {/* 6. Aylık özet stat'ları */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Bu Ay Harcanan"
          value={formatTRY(thisMonthSpent)}
          tone="danger"
        />
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
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
            <Separator className="my-2" />
            <Row
              label="Beklenen aylık tasarruf"
              value={projectedSurplus}
              positive={projectedSurplus >= 0}
              bold
            />
          </div>
        </CardContent>
      </Card>
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
          ? 'text-muted-foreground'
          : 'text-foreground';

  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>
          {value}
        </p>
      </CardContent>
    </Card>
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
      <span className={`text-muted-foreground ${weight}`}>{label}</span>
      <span className={`tabular-nums ${valueColor} ${weight}`}>
        {value >= 0 ? '+' : ''}
        {formatTRY(value)}
      </span>
    </div>
  );
}
