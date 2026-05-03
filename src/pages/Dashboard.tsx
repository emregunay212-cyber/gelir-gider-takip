import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CountUp } from '@/components/AnimatedNumber';
import { formatTRY, monthKey, getDaysInMonth } from '@/lib/format';
import {
  SEED_ACCOUNTS,
  SEED_DEBTS,
  SEED_INCOMES,
  type SeedIncome,
} from '@/db/seed';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useCustomIncomes } from '@/features/custom-data/CustomIncomesProvider';
import { useCustomDebts } from '@/features/custom-data/CustomDebtsProvider';
import { RemindersCard } from '@/features/reminders/RemindersCard';
import type { SeedDebt } from '@/db/seed';
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
import { useAccountOverrides } from '@/features/accounts/AccountOverridesProvider';
import { useCustomAccounts } from '@/features/custom-data/CustomAccountsProvider';

function sumAccountBalances(
  accounts: ReadonlyArray<{ name: string; type: string; balance: number }>,
  getOverride: (name: string) => { amount: number } | undefined,
): number {
  return accounts
    .filter((a) => a.type !== 'virtual_kasa')
    .reduce((acc, a) => {
      const override = getOverride(a.name);
      return acc + (override ? override.amount : a.balance);
    }, 0);
}

function sumMonthlyDebtsActive(
  debts: readonly SeedDebt[],
  closedSet: Set<string>,
): number {
  return debts
    .filter((d) => !d.isPaidOff && !closedSet.has(d.name))
    .reduce((acc, d) => acc + d.monthlyPayment, 0);
}

/**
 * Aylık tahmini gelir — SADECE düzenli (monthly) maaşlar.
 * Kurs ücreti, maç ücreti gibi seasonal/one-time gelirler "henüz gelmedi"
 * varsayılır; gelince kullanıcı "+ Gelen Para" veya "Yattı" ile manuel ekler.
 */
function estimatedMonthlyIncome(
  incomes: readonly SeedIncome[],
  resolveAmount: (name: string, base: number, month: string) => number,
  currentMonth: string,
): number {
  return incomes.reduce((acc, income) => {
    if (income.frequency !== 'monthly') return acc;
    // Sadece maaş tipi düzenli gelirler aylık tahmine dahil olur.
    // Bonus (Sodexo gibi) "garantili maaş" sayılmaz, kullanıcı kasaya
    // "Geldi" diyerek manuel ekler.
    if (income.category !== 'salary') return acc;

    const base =
      income.amountFixed ??
      (income.amountMin != null && income.amountMax != null
        ? (income.amountMin + income.amountMax) / 2
        : 0);

    return acc + resolveAmount(income.name, base, currentMonth);
  }, 0);
}

export default function Dashboard() {
  const { totalDelta: salaryDelta } = useSalary();
  const { totalDelta: cashDelta } = useCash();
  const {
    totalDelta: expenseDelta,
    monthlyTotal: expenseMonthly,
    monthlySavings,
  } = useExpense();
  const { monthlyTotal: billsMonthly } = useBills();
  const { totalDelta: debtPaidDelta, isClosedByPayments } = useDebtPayment();
  const { resolveAmount } = useIncomeOverrides();
  const { dailyLimit } = useSettings();
  const { getOverride: getAccountOverride } = useAccountOverrides();
  const { items: customIncomesItems, asSeedList: customIncomesAsSeed } =
    useCustomIncomes();
  const customNameSet = new Set(customIncomesItems.map((c) => c.name));
  const allIncomes: SeedIncome[] = [
    ...customIncomesAsSeed(),
    ...SEED_INCOMES.filter((s) => !customNameSet.has(s.name)),
  ];

  const { items: customAccountsItems, asSeedList: customAccountsAsSeed } =
    useCustomAccounts();
  const customAcctSet = new Set(customAccountsItems.map((c) => c.name));
  const allAccounts = [
    ...customAccountsAsSeed(),
    ...SEED_ACCOUNTS.filter((s) => !customAcctSet.has(s.name)),
  ];

  const { items: customDebtsItems, asSeedList: customDebtsAsSeed } =
    useCustomDebts();
  const customDebtSet = new Set(customDebtsItems.map((c) => c.name));
  const allDebts: SeedDebt[] = [
    ...customDebtsAsSeed(),
    ...SEED_DEBTS.filter((s) => !customDebtSet.has(s.name)),
  ];

  const totalCash =
    sumAccountBalances(allAccounts, getAccountOverride) +
    salaryDelta() +
    cashDelta() -
    expenseDelta() -
    debtPaidDelta();

  const closedSet = new Set(
    allDebts.filter((d) => isClosedByPayments(d.name)).map((d) => d.name),
  );
  const monthlyDebts = sumMonthlyDebtsActive(allDebts, closedSet);
  const monthlyBills = billsMonthly();
  const monthlyIncome = estimatedMonthlyIncome(
    allIncomes,
    resolveAmount,
    monthKey(),
  );

  const thisMonthSpent = expenseMonthly(monthKey());
  const thisMonthSavings = monthlySavings(monthKey(), dailyLimit);

  // Aylık projeksiyon: geçen gün gerçek harcama + kalan gün × limit
  const passedDays = new Date().getDate();
  const totalDays = getDaysInMonth(monthKey());
  const remainingDays = Math.max(0, totalDays - passedDays);
  const projectedRemainingDaily = remainingDays * dailyLimit;
  const projectedTotalDaily = thisMonthSpent + projectedRemainingDaily;
  const projectedSurplus =
    monthlyIncome - monthlyDebts - monthlyBills - projectedTotalDaily;

  const cardMotion = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };
  const cardTransition = (i: number) => ({
    duration: 0.45,
    delay: 0.05 + i * 0.06,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  });

  return (
    <section className="space-y-4">
      {/* 1. EN KRİTİK: Bugünün limiti + Harcama Ekle butonu (kendi animasyonu var) */}
      <TodaySpendingCard />

      {/* 1.5. Hatırlatmalar — bugün için aksiyon gerektirenler (varsa) */}
      <motion.div {...cardMotion} transition={cardTransition(0)}>
        <RemindersCard />
      </motion.div>

      {/* 2. Bugünkü harcamalar listesi */}
      <motion.div {...cardMotion} transition={cardTransition(1)}>
        <TodayExpensesList />
      </motion.div>

      {/* 3. Kasa (toplam param) */}
      <motion.div {...cardMotion} transition={cardTransition(2)}>
        <Card>
          <CardContent className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kasa (toplam param)
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              <CountUp value={totalCash} format={(n) => formatTRY(n)} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tüm banka hesapları + evdeki nakit
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Hızlı kasa hareketi */}
      <motion.div {...cardMotion} transition={cardTransition(3)}>
        <QuickCashButtons />
      </motion.div>

      {/* 5. Yaklaşan gelir (maaşlar) */}
      <motion.div {...cardMotion} transition={cardTransition(4)}>
        <UpcomingIncomeCard />
      </motion.div>

      {/* 6. Aylık özet stat'ları */}
      <motion.div
        {...cardMotion}
        transition={cardTransition(5)}
        className="grid grid-cols-2 gap-3"
      >
        <Stat
          label="Bu Ay Harcanan"
          value={thisMonthSpent}
          tone="danger"
        />
        <Stat
          label="Bu Ayın Tasarrufu"
          value={thisMonthSavings}
          tone={thisMonthSavings >= 0 ? 'success' : 'danger'}
        />
        <Stat label="Aylık Borç" value={monthlyDebts} tone="danger" />
        <Stat
          label="Aylık Gelir (ort.)"
          value={monthlyIncome}
          tone="success"
        />
      </motion.div>

      {/* 7. Aylık projeksiyon */}
      <motion.div {...cardMotion} transition={cardTransition(6)}>
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
                label={`Bu ay harcanan (${passedDays} gün)`}
                value={-thisMonthSpent}
              />
              {remainingDays > 0 && (
                <Row
                  label={`Kalan ${remainingDays} gün × ${formatTRY(dailyLimit)}`}
                  value={-projectedRemainingDaily}
                />
              )}
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
      </motion.div>
    </section>
  );
}

interface StatProps {
  label: string;
  value: number;
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
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Card>
        <CardContent className="p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>
            <CountUp value={value} format={(n) => formatTRY(n)} />
          </p>
        </CardContent>
      </Card>
    </motion.div>
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
