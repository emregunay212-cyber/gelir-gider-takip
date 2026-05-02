import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIncomeOverrides } from './IncomeOverridesProvider';
import { formatTRY, monthLabel } from '@/lib/format';

interface Props {
  incomeName: string;
  currentAmount: number;
  open: boolean;
  onClose: () => void;
}

export function SalaryRaiseDialog({
  incomeName,
  currentAmount,
  open,
  onClose,
}: Props) {
  const { overrides, setOverride, removeOverride } = useIncomeOverrides();

  const existing = overrides[incomeName];
  const [amount, setAmount] = useState<number>(existing?.amount ?? currentAmount);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    existing?.effectiveFrom ?? '2026-08',
  );

  useEffect(() => {
    if (open) {
      setAmount(existing?.amount ?? currentAmount);
      setEffectiveFrom(existing?.effectiveFrom ?? '2026-08');
    }
  }, [open, existing, currentAmount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!/^\d{4}-\d{2}$/.test(effectiveFrom)) return;
    setOverride(incomeName, { effectiveFrom, amount });
    toast.success(
      `${incomeName} zammı planlandı`,
      {
        description: `${monthLabel(effectiveFrom)}'dan itibaren ${formatTRY(amount)}`,
      },
    );
    onClose();
  }

  function handleRemove() {
    removeOverride(incomeName);
    toast.info(`${incomeName} zam planı silindi`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm gap-4 p-5">
        <DialogHeader>
          <DialogTitle>Maaş Zammı Planla</DialogTitle>
          <DialogDescription>
            {incomeName} · belirtilen aydan itibaren yeni tutar geçerli olur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="raise-amount">Yeni tutar (TL)</Label>
            <Input
              id="raise-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount > 0 ? amount : ''}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="h-12 text-2xl font-bold tabular-nums"
              autoFocus
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="raise-from">Hangi aydan itibaren?</Label>
            <Input
              id="raise-from"
              type="month"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              className="h-12"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Vazgeç
            </Button>
            <Button type="submit" className="flex-1">
              Kaydet
            </Button>
          </div>

          {existing && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Mevcut zam planını sil
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
