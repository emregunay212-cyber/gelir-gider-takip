import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTRY } from '@/lib/format';
import { SEED_ACCOUNTS, type SeedAccount } from '@/db/seed';
import type { AccountOwner } from '@/types';
import { useSalary } from '@/features/income/SalaryProvider';
import { useCash } from '@/features/cash/CashProvider';
import { useExpense } from '@/features/expense/ExpenseProvider';
import { useDebtPayment } from '@/features/debt/DebtPaymentProvider';
import { useAccountOverrides } from '@/features/accounts/AccountOverridesProvider';
import { EditAccountBalanceDialog } from '@/features/accounts/EditAccountBalanceDialog';
import { useCustomAccounts } from '@/features/custom-data/CustomAccountsProvider';
import { AddAccountDialog } from '@/features/custom-data/AddAccountDialog';
import { safeDocId } from '@/lib/firestore-helpers';

const OWNER_LABEL: Record<AccountOwner, string> = {
  emre: 'Emre',
  sila: 'Sıla',
  shared: 'Ortak',
};

const OWNER_BADGE: Record<AccountOwner, string> = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)] border-[var(--color-emre)]/30',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)] border-[var(--color-sila)]/30',
  shared: 'bg-muted text-muted-foreground border-border',
};

interface AccountRow {
  name: string;
  type: 'bank' | 'cash' | 'savings' | 'virtual_kasa';
  owner: AccountOwner;
  bankName?: string;
  baseBalance: number;
  effectiveBalance: number;
  hasOverride: boolean;
  salaryDeltaAmount: number;
  cashDeltaAmount: number;
  expenseDeltaAmount: number;
  debtDeltaAmount: number;
}

export default function Hesaplar() {
  const { balanceDelta: salaryDelta, totalDelta: salaryTotal } = useSalary();
  const { balanceDelta: cashDelta, totalDelta: cashTotal } = useCash();
  const { balanceDelta: expenseDelta, totalDelta: expenseTotal } = useExpense();
  const { balanceDelta: debtDelta, totalDelta: debtTotal } = useDebtPayment();
  const { getOverride } = useAccountOverrides();
  const {
    items: customAccounts,
    asSeedList: customAccountsAsSeed,
    remove: removeCustomAccount,
  } = useCustomAccounts();

  const [editing, setEditing] = useState<{
    name: string;
    effective: number;
  } | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);

  const customNameSet = new Set(customAccounts.map((c) => c.name));
  const allAccounts: SeedAccount[] = [
    ...customAccountsAsSeed(),
    ...SEED_ACCOUNTS.filter((s) => !customNameSet.has(s.name)),
  ];

  const accountsWithDelta: (AccountRow & { isCustom: boolean })[] =
    allAccounts.map((a) => {
    const sDelta = salaryDelta(a.name);
    const cDelta = cashDelta(a.name);
    const eDelta = expenseDelta(a.name);
    const dDelta = debtDelta(a.name);
    const override = getOverride(a.name);
    // Override varsa: kullanıcının girdiği tutar = baseBalance kabul edilir,
    // delta'lar (override SONRASI yapılan hareketler) yine eklenir.
    const baseBalance = override ? override.amount : a.balance;
    const effectiveBalance = baseBalance + sDelta + cDelta - eDelta - dDelta;
    return {
      name: a.name,
      type: a.type,
      owner: a.owner,
      bankName: a.bankName,
      baseBalance,
      effectiveBalance,
      hasOverride: !!override,
      isCustom: customNameSet.has(a.name),
      salaryDeltaAmount: sDelta,
      cashDeltaAmount: cDelta,
      expenseDeltaAmount: eDelta,
      debtDeltaAmount: dDelta,
    };
  });

  const total =
    accountsWithDelta.reduce((acc, a) => acc + a.effectiveBalance, 0) +
    // Hareketleri ikinci kez eklememek için yukarıda zaten dahil edildi.
    // Aşağıdaki sumlar SADECE total'a değil, "otomatik" hesabı tek satırda
    // doğrulamak için referans olarak duruyor — kullanılmıyor.
    0;
  void salaryTotal;
  void cashTotal;
  void expenseTotal;
  void debtTotal;

  const groups: Record<AccountOwner, (AccountRow & { isCustom: boolean })[]> =
    {
      emre: [],
      sila: [],
      shared: [],
    };
  accountsWithDelta.forEach((a) => groups[a.owner].push(a));

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Kasa</h2>
          <p className="text-sm text-muted-foreground">
            Toplam:{' '}
            <span className="font-semibold tabular-nums">
              {formatTRY(total)}
            </span>
            <span className="ml-1">· tüm hesaplar + evdeki nakit</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setAddingAccount(true)}
          className="shrink-0"
        >
          <Plus className="size-4" />
          Yeni
        </Button>
      </div>

      {(['emre', 'sila', 'shared'] as const).map((owner) => {
        const list = groups[owner];
        if (list.length === 0) return null;
        const ownerTotal = list.reduce((s, a) => s + a.effectiveBalance, 0);
        return (
          <div key={owner} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`px-2 py-0 text-xs font-medium ${OWNER_BADGE[owner]}`}
              >
                {OWNER_LABEL[owner]}
              </Badge>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatTRY(ownerTotal)}
              </span>
            </div>
            <ul className="space-y-1.5">
              {list.map((account) => (
                <Card key={account.name}>
                  <CardContent className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">{account.name}</p>
                        {account.hasOverride && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/15 px-1.5 py-0 text-[10px] font-semibold text-amber-300 border-amber-500/30"
                          >
                            Manuel
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
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
                    <div className="flex items-center gap-1">
                      <p className="font-semibold tabular-nums">
                        {formatTRY(account.effectiveBalance)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            name: account.name,
                            effective: account.effectiveBalance,
                          })
                        }
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                        aria-label="Bakiyeyi düzelt"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      {account.isCustom && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await removeCustomAccount(safeDocId(account.name));
                              toast.success(`${account.name} silindi`);
                            } catch (err) {
                              toast.error('Silinemedi', {
                                description:
                                  err instanceof Error
                                    ? err.message
                                    : 'Bilinmeyen hata',
                              });
                            }
                          }}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--color-danger)]"
                          aria-label="Hesabı sil"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="text-center text-xs text-muted-foreground">
        Bakiye yanındaki kalem ikonu ile bankaya bakıp gerçek tutarı girebilirsin.
      </p>

      {editing && (
        <EditAccountBalanceDialog
          open
          onClose={() => setEditing(null)}
          accountName={editing.name}
          currentEffective={editing.effective}
        />
      )}

      <AddAccountDialog
        open={addingAccount}
        onClose={() => setAddingAccount(false)}
      />
    </section>
  );
}
