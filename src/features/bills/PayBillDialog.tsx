import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBillPayment } from './BillPaymentProvider';
import { useAllAccounts } from '@/features/custom-data/useAllAccounts';
import { formatTRY, monthLabel } from '@/lib/format';
import { celebrateSmall } from '@/lib/confetti';

interface Props {
  open: boolean;
  onClose: () => void;
  billName: string;
  monthKey: string;
  amount: number;
  /** Default seçili olacak hesap (varsa). */
  suggestedAccountName?: string;
}

const NONE_VALUE = '__none__';

export function PayBillDialog({
  open,
  onClose,
  billName,
  monthKey,
  amount,
  suggestedAccountName,
}: Props) {
  const { markPaid } = useBillPayment();
  const allAccounts = useAllAccounts();

  const [accountName, setAccountName] = useState<string>(
    suggestedAccountName ?? NONE_VALUE,
  );
  const [saving, setSaving] = useState(false);

  async function handleConfirm(): Promise<void> {
    setSaving(true);
    try {
      const finalAccount =
        accountName === NONE_VALUE ? undefined : accountName;
      markPaid(billName, monthKey, amount, finalAccount);
      toast.success(
        `${billName} · ${monthLabel(monthKey)} ödendi`,
        finalAccount
          ? {
              description: `${formatTRY(amount)} ${finalAccount} hesabından düşüldü`,
            }
          : { description: 'Hesap belirtilmedi — bakiye düşümü yapılmadı' },
      );
      celebrateSmall();
      onClose();
    } catch (err) {
      toast.error('Kaydedilemedi', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {billName} — {monthLabel(monthKey)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ödeme tutarı
            </p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-[var(--color-danger)]">
              {formatTRY(amount)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Hangi hesaptan ödendi?</Label>
            <Select
              value={accountName}
              onValueChange={(v) => setAccountName(v ?? NONE_VALUE)}
            >
              <SelectTrigger>
                <SelectValue placeholder="— belirtme —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>— belirtme —</SelectItem>
                {allAccounts.map((acc) => (
                  <SelectItem key={acc.name} value={acc.name}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Hesap seçersen bu tutar kasadan otomatik düşer. Boş bırakırsan
              sadece "ödendi" işareti konur, bakiye değişmez.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Ödendi olarak işaretle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
