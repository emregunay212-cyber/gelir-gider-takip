import { formatTRY } from '../lib/format';
import { SEED_ACCOUNTS } from '../db/seed';
import type { AccountOwner } from '../types';
import { useSalary } from '../features/income/SalaryProvider';
import { useCash } from '../features/cash/CashProvider';
import { useExpense } from '../features/expense/ExpenseProvider';
import { useDebtPayment } from '../features/debt/DebtPaymentProvider';

const OWNER_LABEL: Record<AccountOwner, string> = {
  emre: 'Emre',
  sila: 'Sıla',
  shared: 'Ortak',
};

const OWNER_COLOR: Record<AccountOwner, string> = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)]',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)]',
  shared: 'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
};

export default function Hesaplar() {
  const { balanceDelta: salaryDelta, totalDelta: salaryTotal } = useSalary();
  const { balanceDelta: cashDelta, totalDelta: cashTotal } = useCash();
  const { balanceDelta: expenseDelta, totalDelta: expenseTotal } = useExpense();
  const { balanceDelta: debtDelta, totalDelta: debtTotal } = useDebtPayment();

  const accountsWithDelta = SEED_ACCOUNTS.map((a) => {
    const sDelta = salaryDelta(a.name);
    const cDelta = cashDelta(a.name);
    const eDelta = expenseDelta(a.name);
    const dDelta = debtDelta(a.name);
    return {
      ...a,
      effectiveBalance: a.balance + sDelta + cDelta - eDelta - dDelta,
      salaryDeltaAmount: sDelta,
      cashDeltaAmount: cDelta,
      expenseDeltaAmount: eDelta,
      debtDeltaAmount: dDelta,
    };
  });
  const total =
    SEED_ACCOUNTS.reduce((acc, a) => acc + a.balance, 0) +
    salaryTotal() +
    cashTotal() -
    expenseTotal() -
    debtTotal();

  const groups: Record<AccountOwner, typeof accountsWithDelta> = {
    emre: [],
    sila: [],
    shared: [],
  };
  accountsWithDelta.forEach((a) => groups[a.owner].push(a));

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Kasa</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Toplam:{' '}
          <span className="font-semibold text-[var(--color-text)]">
            {formatTRY(total)}
          </span>
          <span className="ml-1">· tüm hesaplar + evdeki nakit</span>
        </p>
      </div>

      {(['emre', 'sila', 'shared'] as const).map((owner) => {
        const list = groups[owner];
        if (list.length === 0) return null;
        const ownerTotal = list.reduce((s, a) => s + a.effectiveBalance, 0);
        return (
          <div key={owner} className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${OWNER_COLOR[owner]}`}
              >
                {OWNER_LABEL[owner]}
              </span>
              <span className="text-xs text-[var(--color-muted)]">
                {formatTRY(ownerTotal)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {list.map((account) => (
                <li
                  key={account.name}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{account.name}</p>
                    <p className="text-[11px] text-[var(--color-muted)]">
                      {account.bankName ??
                        (account.type === 'cash' ? 'Nakit' : '')}
                      {account.salaryDeltaAmount > 0 && (
                        <span className="ml-1 text-[var(--color-success)]">
                          · +{formatTRY(account.salaryDeltaAmount)} maaş
                        </span>
                      )}
                      {account.cashDeltaAmount !== 0 && (
                        <span
                          className={`ml-1 ${
                            account.cashDeltaAmount > 0
                              ? 'text-[var(--color-success)]'
                              : 'text-[var(--color-danger)]'
                          }`}
                        >
                          · {account.cashDeltaAmount > 0 ? '+' : ''}
                          {formatTRY(account.cashDeltaAmount)} hareket
                        </span>
                      )}
                      {account.expenseDeltaAmount > 0 && (
                        <span className="ml-1 text-[var(--color-danger)]">
                          · −{formatTRY(account.expenseDeltaAmount)} harcama
                        </span>
                      )}
                      {account.debtDeltaAmount > 0 && (
                        <span className="ml-1 text-[var(--color-danger)]">
                          · −{formatTRY(account.debtDeltaAmount)} borç
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">
                    {formatTRY(account.effectiveBalance)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="text-center text-xs text-[var(--color-muted)]">
        Bakiye düzenleme, transfer ve harcama düşümü Faz 4–6'da gelecek.
      </p>
    </section>
  );
}
