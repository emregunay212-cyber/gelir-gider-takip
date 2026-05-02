import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTRY, monthKey } from '@/lib/format';
import { SEED_RECURRING_EXPENSES } from '@/db/seed';
import type { RecurringExpenseCategory } from '@/types';
import { useBills } from '@/features/bills/BillsProvider';
import { EditBillDialog } from '@/features/bills/EditBillDialog';
import { celebrateSmall } from '@/lib/confetti';

const CATEGORY_LABEL: Record<RecurringExpenseCategory, string> = {
  electricity: 'Elektrik',
  water: 'Su',
  gas: 'Doğalgaz',
  phone: 'Telefon',
  internet: 'İnternet',
  subscription: 'Abonelik',
  other: 'Diğer',
};

const CATEGORY_ICON: Record<RecurringExpenseCategory, string> = {
  electricity: '⚡',
  water: '💧',
  gas: '🔥',
  phone: '📱',
  internet: '🌐',
  subscription: '📺',
  other: '📄',
};

export default function Faturalar() {
  const { getAmount, isPaid, togglePaid, monthlyTotal, monthlyPaidTotal } =
    useBills();
  const [editing, setEditing] = useState<string | null>(null);
  const currentMonth = monthKey();
  const total = monthlyTotal();
  const paidTotal = monthlyPaidTotal(currentMonth);
  const pendingTotal = total - paidTotal;
  const hasMissing = SEED_RECURRING_EXPENSES.some(
    (b) => getAmount(b.name) === 0,
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Faturalar</h2>
        <p className="text-sm text-muted-foreground">
          Aylık toplam:{' '}
          <span className="font-semibold tabular-nums">
            {formatTRY(total)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-[var(--color-success)]/30 bg-[var(--color-success)]/5">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
              Bu ay ödenen
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-[var(--color-success)]">
              {formatTRY(paidTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-warning)]">
              Bekleyen
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-[var(--color-warning)]">
              {formatTRY(pendingTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {hasMissing && (
        <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10">
          <CardContent className="p-3 text-sm text-[var(--color-warning)]">
            ⚠ Bazı fatura tutarları boş — kalemin yanındaki kalem ikonuna tıkla,
            tutarı gir.
          </CardContent>
        </Card>
      )}

      <ul className="space-y-2">
        {SEED_RECURRING_EXPENSES.map((bill, index) => {
          const amount = getAmount(bill.name);
          const paid = isPaid(bill.name, currentMonth);
          const cardClass = paid
            ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
            : '';
          return (
            <motion.div
              key={bill.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
            <Card className={cardClass}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {CATEGORY_ICON[bill.category]}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">{bill.name}</p>
                        {paid && (
                          <Badge className="bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30 px-1.5 py-0 text-[10px] font-semibold">
                            Ödendi
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {CATEGORY_LABEL[bill.category]} · ayın{' '}
                        {bill.paymentDayOfMonth}'i
                        {bill.ownerKey
                          ? ` · ${bill.ownerKey === 'emre' ? 'Emre' : 'Sıla'}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-semibold tabular-nums ${
                        amount === 0
                          ? 'text-muted-foreground'
                          : 'text-[var(--color-danger)]'
                      }`}
                    >
                      {amount === 0 ? '—' : formatTRY(amount)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditing(bill.name)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                      aria-label="Düzenle"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                </div>

                {amount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant={paid ? 'secondary' : 'outline'}
                    onClick={() => {
                      togglePaid(bill.name, currentMonth);
                      if (!paid) celebrateSmall();
                    }}
                    className={`mt-2 w-full ${
                      paid
                        ? 'bg-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/25'
                        : ''
                    }`}
                  >
                    {paid && <Check className="size-3.5" />}
                    {paid
                      ? 'Bu ay ödendi (geri al)'
                      : 'Bu ay ödendi olarak işaretle'}
                  </Button>
                )}
              </CardContent>
            </Card>
            </motion.div>
          );
        })}
      </ul>

      {editing && (
        <EditBillDialog
          billName={editing}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
