import { useState } from 'react';
import { Banknote, Check, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SEED_INCOMES, type SeedIncome } from '@/db/seed';
import { useSalary } from './SalaryProvider';
import { formatTRY, monthKey } from '@/lib/format';
import { SalaryReceivedDialog } from './SalaryReceivedDialog';
import { CashEntryDialog } from '@/features/cash/CashEntryDialog';
import { useCustomIncomes } from '@/features/custom-data/CustomIncomesProvider';

interface PendingItem {
  incomeName: string;
  defaultAmount: number;
  accountName: string;
  ownerKey: 'emre' | 'sila';
  dayOfMonth: number;
}

interface ExtraIncome {
  name: string;
  expectedAmount: number;
  description: string;
  accountName?: string;
}

const ACCOUNT_BY_OWNER: Record<'emre' | 'sila', string> = {
  emre: 'Emre Garanti',
  sila: 'Sıla Garanti',
};

function getMonthlySalaries(allIncomes: readonly SeedIncome[]): PendingItem[] {
  return allIncomes
    .filter((i) => i.frequency === 'monthly' && i.category === 'salary')
    .map((income) => {
    const defaultAmount =
      income.amountFixed ??
      (income.amountMin != null && income.amountMax != null
        ? (income.amountMin + income.amountMax) / 2
        : 0);
    return {
      incomeName: income.name,
      defaultAmount,
      accountName: ACCOUNT_BY_OWNER[income.ownerKey],
      ownerKey: income.ownerKey,
      dayOfMonth: income.dayOfMonth ?? 1,
    };
  });
}

/**
 * Bu ay aktif olan dönemsel/tek seferlik bekleyen gelirler.
 * Şimdiye kadar manuel olarak alınmış sayılmıyor; gelince "Geldi" butonu ile
 * Gelen Para olarak girilir.
 */
function getExtraPendingIncomes(
  allIncomes: readonly SeedIncome[],
  currentMonth: string,
): ExtraIncome[] {
  const items: ExtraIncome[] = [];

  for (const income of allIncomes) {
    if (income.frequency === 'seasonal_range' && income.activeMonths) {
      const active = income.activeMonths.some(
        (r) => currentMonth >= r.startMonth && currentMonth <= r.endMonth,
      );
      if (!active) continue;
      const expected =
        income.amountFixed ??
        (income.amountMin != null && income.amountMax != null
          ? (income.amountMin + income.amountMax) / 2
          : 0);
      items.push({
        name: income.name,
        expectedAmount: expected,
        description: `${income.name} (${currentMonth})`,
        accountName: ACCOUNT_BY_OWNER[income.ownerKey],
      });
    } else if (
      income.frequency === 'one_time' &&
      income.oneTimeOccurrences &&
      income.oneTimeOccurrences.length > 0
    ) {
      const perOccurrence = income.oneTimeOccurrences[0]?.amount ?? 0;
      const totalRemaining = income.oneTimeOccurrences.reduce(
        (s, o) => s + o.amount,
        0,
      );
      items.push({
        name: income.name,
        expectedAmount: perOccurrence,
        description: `${income.name} (1 adet)`,
        accountName: ACCOUNT_BY_OWNER[income.ownerKey],
      });
      // Toplam bilgi notu için tek satır yeter — adet bilgisi name'de yok ama
      // expectedAmount tek adet, hatırlatma için info satırında belirtilir.
      void totalRemaining;
    } else if (
      income.frequency === 'monthly' &&
      income.category !== 'salary'
    ) {
      // Aylık ama maaş olmayan gelirler (örn. Sodexo gibi yan haklar).
      // Tutar değişkense ortalamayı varsayılan göster, kullanıcı "Geldi"
      // ile gerçek tutarı girer.
      const expected =
        income.amountFixed ??
        (income.amountMin != null && income.amountMax != null
          ? (income.amountMin + income.amountMax) / 2
          : 0);
      items.push({
        name: income.name,
        expectedAmount: expected,
        description: `${income.name} (${currentMonth})`,
        // accountName yok → kullanıcı CashEntryDialog'da hesap seçer.
      });
    }
  }

  return items;
}

export function UpcomingIncomeCard() {
  const { isReceived, getReceipt, removeReceipt } = useSalary();
  const { items: customItems, asSeedList: customIncomesAsSeed } =
    useCustomIncomes();
  const [openItem, setOpenItem] = useState<PendingItem | null>(null);
  const [openExtra, setOpenExtra] = useState<ExtraIncome | null>(null);

  const currentMonth = monthKey();
  const customNameSet = new Set(customItems.map((c) => c.name));
  const allIncomes: SeedIncome[] = [
    ...customIncomesAsSeed(),
    ...SEED_INCOMES.filter((s) => !customNameSet.has(s.name)),
  ];
  const all = getMonthlySalaries(allIncomes);
  const pending = all.filter(
    (item) => !isReceived(item.incomeName, currentMonth),
  );
  const received = all.filter((item) =>
    isReceived(item.incomeName, currentMonth),
  );
  const extras = getExtraPendingIncomes(allIncomes, currentMonth);

  if (pending.length === 0 && received.length === 0 && extras.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Banknote className="size-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Bu Ay Maaşlar
            </p>
          </div>

          {pending.length > 0 && (
            <ul className="space-y-2">
              {pending.map((item) => (
                <li
                  key={item.incomeName}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.incomeName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Ayın {item.dayOfMonth}'i · {item.accountName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-primary">
                      ~{formatTRY(item.defaultAmount)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setOpenItem(item)}
                    >
                      Yattı
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pending.length > 0 && received.length > 0 && (
            <Separator className="bg-primary/15" />
          )}

          {received.length > 0 && (
            <ul className="space-y-1.5">
              {received.map((item) => {
                const receipt = getReceipt(item.incomeName, currentMonth);
                const isPre = receipt?.preExisting === true;
                return (
                  <li
                    key={item.incomeName}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-[var(--color-success)]" />
                      <p className="truncate text-sm">
                        <span className="font-medium">{item.incomeName}</span>
                        <span className="ml-1 text-muted-foreground">
                          → {item.accountName}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPre ? (
                        <span className="text-[11px] text-muted-foreground">
                          yatmış · ödemeler yapıldı
                        </span>
                      ) : (
                        <>
                          <span className="text-sm font-semibold tabular-nums text-[var(--color-success)]">
                            {formatTRY(receipt?.amount ?? 0)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeReceipt(item.incomeName, currentMonth)
                            }
                            className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-[var(--color-danger)]"
                            aria-label="Geri al"
                          >
                            geri al
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {extras.length > 0 && (
            <>
              <Separator className="bg-primary/15" />
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  <Clock className="size-3" />
                  Bekleyen Ek Gelirler
                </div>
                <ul className="space-y-2">
                  {extras.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          henüz alınmadı · {item.accountName ?? 'kasaya'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums text-amber-300">
                          ~{formatTRY(item.expectedAmount)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenExtra(item)}
                        >
                          Geldi
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {openItem && (
        <SalaryReceivedDialog
          incomeName={openItem.incomeName}
          accountName={openItem.accountName}
          defaultAmount={openItem.defaultAmount}
          open
          onClose={() => setOpenItem(null)}
        />
      )}

      {openExtra && (
        <CashEntryDialog
          direction="in"
          open
          onClose={() => setOpenExtra(null)}
          defaultAmount={openExtra.expectedAmount}
          defaultDescription={openExtra.description}
          defaultAccountName={openExtra.accountName}
        />
      )}
    </>
  );
}
