import { useState } from 'react';
import { Check, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { addMonth, formatTRY, monthKey, monthLabel } from '@/lib/format';
import { SEED_DEBTS, type SeedDebt } from '@/db/seed';
import { useDebtPayment } from '@/features/debt/DebtPaymentProvider';
import { PayDebtDialog } from '@/features/debt/PayDebtDialog';
import { useCustomDebts } from '@/features/custom-data/CustomDebtsProvider';
import { AddDebtDialog } from '@/features/custom-data/AddDebtDialog';
import { safeDocId } from '@/lib/firestore-helpers';

const OWNER_LABEL: Record<'emre' | 'sila', string> = {
  emre: 'Emre',
  sila: 'Sıla',
};

const OWNER_BADGE: Record<'emre' | 'sila', string> = {
  emre: 'bg-[var(--color-emre)]/15 text-[var(--color-emre)] border-[var(--color-emre)]/30',
  sila: 'bg-[var(--color-sila)]/15 text-[var(--color-sila)] border-[var(--color-sila)]/30',
};

interface PayTarget {
  debt: SeedDebt;
  monthKey: string;
  closesDebt: boolean;
}

export default function Borclar() {
  const {
    isPaid,
    unmarkPaid,
    paymentMonths,
    remainingInstallments,
    effectivePrincipal,
    isClosedByPayments,
    monthlyPendingTotal,
    monthlyPaidTotal,
  } = useDebtPayment();
  const {
    items: customDebts,
    asSeedList: customDebtsAsSeed,
    remove: removeCustomDebt,
  } = useCustomDebts();

  const [addingDebt, setAddingDebt] = useState(false);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  const customSet = new Set(customDebts.map((c) => c.name));
  const allDebts: SeedDebt[] = [
    ...customDebtsAsSeed(),
    ...SEED_DEBTS.filter((s) => !customSet.has(s.name)),
  ];

  const currentMonth = monthKey();
  const monthLabelText = monthLabel(currentMonth);

  const active = allDebts
    .filter((d) => !d.isPaidOff && !isClosedByPayments(d.name))
    .sort((a, b) => b.monthlyPayment - a.monthlyPayment);
  const closed = allDebts.filter(
    (d) => d.isPaidOff || isClosedByPayments(d.name),
  );

  const totalMonthly = active.reduce((acc, d) => acc + d.monthlyPayment, 0);
  const paidThisMonth = monthlyPaidTotal(currentMonth);
  const pendingThisMonth = monthlyPendingTotal(currentMonth);

  function openPayDialog(debt: SeedDebt, targetMonth: string): void {
    const remaining = remainingInstallments(debt.name);
    const willClose =
      remaining != null && remaining <= 1 && !isPaid(debt.name, targetMonth);
    setPayTarget({ debt, monthKey: targetMonth, closesDebt: willClose });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Borçlar</h2>
          <p className="text-sm text-muted-foreground">
            Aylık toplam ödeme:{' '}
            <span className="font-semibold text-[var(--color-danger)]">
              {formatTRY(totalMonthly)}
            </span>
            <span className="ml-1">· {active.length} aktif</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setAddingDebt(true)}
          className="shrink-0"
        >
          <Plus className="size-4" />
          Yeni
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="border-[var(--color-success)]/30 bg-[var(--color-success)]/5">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
              {monthLabelText} ödenen
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-[var(--color-success)]">
              {formatTRY(paidThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
          <CardContent className="p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-warning)]">
              Bekleyen
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-[var(--color-warning)]">
              {formatTRY(pendingThisMonth)}
            </p>
          </CardContent>
        </Card>
      </div>

      <ul className="space-y-2">
        {active.map((debt, index) => {
          const months = paymentMonths(debt.name);
          const lastPaid = months[months.length - 1];
          // Bir sonraki ödenmemiş ay (ileri ödeme için)
          const nextUnpaidMonth = lastPaid
            ? addMonth(lastPaid, 1)
            : currentMonth;
          const showAdvanceButton = lastPaid != null && lastPaid >= currentMonth;
          return (
            <motion.div
              key={debt.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.04,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <DebtCard
                debt={debt}
                paid={isPaid(debt.name, currentMonth)}
                remaining={remainingInstallments(debt.name)}
                principal={effectivePrincipal(debt.name)}
                isCustom={customSet.has(debt.name)}
                lastPaidMonth={lastPaid}
                nextUnpaidMonth={nextUnpaidMonth}
                showAdvanceButton={showAdvanceButton}
                onMark={() => openPayDialog(debt, currentMonth)}
                onAdvance={() => openPayDialog(debt, nextUnpaidMonth)}
                onUnmark={(month) => unmarkPaid(debt.name, month)}
                onRemoveCustom={async () => {
                  try {
                    await removeCustomDebt(safeDocId(debt.name));
                    toast.success(`${debt.name} silindi`);
                  } catch (err) {
                    toast.error('Silinemedi', {
                      description:
                        err instanceof Error ? err.message : 'Bilinmeyen hata',
                    });
                  }
                }}
                monthLabel={monthLabelText}
              />
            </motion.div>
          );
        })}
      </ul>

      {closed.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-success)]">
            ✓ Tamamlanan Borçlar
          </p>
          <ul className="space-y-2">
            {closed.map((debt) => (
              <DebtCard
                key={debt.name}
                debt={debt}
                paid={false}
                remaining={0}
                principal={undefined}
                isCustom={customSet.has(debt.name)}
                lastPaidMonth={undefined}
                nextUnpaidMonth={currentMonth}
                showAdvanceButton={false}
                onMark={() => undefined}
                onAdvance={() => undefined}
                onUnmark={() => undefined}
                onRemoveCustom={async () => {
                  try {
                    await removeCustomDebt(safeDocId(debt.name));
                    toast.success(`${debt.name} silindi`);
                  } catch (err) {
                    toast.error('Silinemedi', {
                      description:
                        err instanceof Error ? err.message : 'Bilinmeyen hata',
                    });
                  }
                }}
                monthLabel={monthLabelText}
                closed
              />
            ))}
          </ul>
        </div>
      )}

      <AddDebtDialog
        open={addingDebt}
        onClose={() => setAddingDebt(false)}
      />

      {payTarget && (
        <PayDebtDialog
          open
          onClose={() => setPayTarget(null)}
          debtName={payTarget.debt.name}
          monthKey={payTarget.monthKey}
          monthlyPayment={payTarget.debt.monthlyPayment}
          closesDebt={payTarget.closesDebt}
        />
      )}
    </section>
  );
}

interface DebtCardProps {
  debt: SeedDebt;
  paid: boolean;
  remaining: number | undefined;
  principal: number | undefined;
  isCustom: boolean;
  lastPaidMonth: string | undefined;
  nextUnpaidMonth: string;
  showAdvanceButton: boolean;
  onMark: () => void;
  onAdvance: () => void;
  onUnmark: (month: string) => void;
  onRemoveCustom: () => void;
  monthLabel: string;
  closed?: boolean;
}

function DebtCard({
  debt,
  paid,
  remaining,
  principal,
  isCustom,
  lastPaidMonth,
  nextUnpaidMonth,
  showAdvanceButton,
  onMark,
  onAdvance,
  onUnmark,
  onRemoveCustom,
  monthLabel: monthLabelText,
  closed,
}: DebtCardProps) {
  const cardClass = closed
    ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5 opacity-80'
    : paid
      ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
      : '';

  return (
    <Card className={cardClass}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`px-1.5 py-0 text-[10px] font-medium ${OWNER_BADGE[debt.ownerKey]}`}
              >
                {OWNER_LABEL[debt.ownerKey]}
              </Badge>
              <p
                className={`truncate font-medium ${closed ? 'line-through' : ''}`}
              >
                {debt.name}
              </p>
              {closed && (
                <Badge className="bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30 px-1.5 py-0 text-[10px] font-semibold">
                  Kapandı
                </Badge>
              )}
              {paid && !closed && (
                <Badge className="bg-[var(--color-success)]/15 text-[var(--color-success)] border-[var(--color-success)]/30 px-1.5 py-0 text-[10px] font-semibold">
                  {monthLabelText} ödendi
                </Badge>
              )}
              {!paid && !closed && lastPaidMonth && lastPaidMonth > monthKey() && (
                <Badge className="bg-primary/15 text-primary border-primary/30 px-1.5 py-0 text-[10px] font-semibold">
                  {monthLabel(lastPaidMonth)}'a kadar ileri ödendi
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {debt.bankOrCreditor}
              {!closed && remaining != null
                ? ` · ${remaining} ay kaldı`
                : ''}
              {!closed && principal != null
                ? ` · ${formatTRY(principal)} kalan`
                : ''}
            </p>
            {debt.type === 'interest_only' && !closed && (
              <p className="mt-1 rounded bg-[var(--color-warning)]/15 px-2 py-1 text-[11px] text-[var(--color-warning)]">
                ⚠ Sadece faiz — ana borç sabit kalır.
              </p>
            )}
            {debt.notes && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {debt.notes}
              </p>
            )}
          </div>
          <div className="text-right">
            <p
              className={`font-semibold tabular-nums ${
                closed ? 'text-muted-foreground line-through' : ''
              }`}
            >
              {formatTRY(debt.monthlyPayment)}
            </p>
            <p className="text-[11px] text-muted-foreground">/ ay</p>
          </div>
        </div>

        {!closed && (
          <div className="mt-2.5 flex flex-col gap-1.5">
            <div className="flex items-stretch gap-1.5">
              <Button
                type="button"
                variant={paid ? 'secondary' : 'outline'}
                size="sm"
                onClick={
                  paid
                    ? () => onUnmark(monthKey())
                    : onMark
                }
                className={`flex-1 ${
                  paid
                    ? 'bg-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/25'
                    : ''
                }`}
              >
                {paid && <Check className="size-3.5" />}
                {paid
                  ? `${monthLabelText} ödendi (geri al)`
                  : `${monthLabelText} ödendi olarak işaretle`}
              </Button>
              {isCustom && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveCustom}
                  className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                  aria-label="Borcu sil"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            {/* İleri ödeme butonu — bu ay zaten ödendiyse ya da
                önceki ay'larda ödenenden sonraki ayı işaretler. */}
            {(paid || showAdvanceButton) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAdvance}
                className="w-full text-[var(--color-primary)] border-primary/30 hover:bg-primary/5"
              >
                <ChevronRight className="size-3.5" />
                {monthLabel(nextUnpaidMonth)}'ı da öde
              </Button>
            )}
          </div>
        )}

        {closed && isCustom && (
          <div className="mt-2.5 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemoveCustom}
              className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"
            >
              <Trash2 className="size-3.5" />
              Sil
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
