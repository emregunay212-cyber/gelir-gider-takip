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
import { useSalary } from './SalaryProvider';
import { monthKey, formatTRY } from '@/lib/format';
import { celebrateSuccess } from '@/lib/confetti';

interface Props {
  incomeName: string;
  accountName: string;
  defaultAmount: number;
  open: boolean;
  onClose: () => void;
}

export function SalaryReceivedDialog({
  incomeName,
  accountName,
  defaultAmount,
  open,
  onClose,
}: Props) {
  const { addReceipt } = useSalary();
  const [amount, setAmount] = useState<number>(defaultAmount);

  useEffect(() => {
    if (open) setAmount(defaultAmount);
  }, [defaultAmount, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) return;
    addReceipt({
      incomeName,
      accountName,
      monthKey: monthKey(),
      amount,
      receivedAt: new Date().toISOString(),
    });
    toast.success(`${formatTRY(amount)} ${incomeName.toLowerCase()} yatırıldı`, {
      description: `Kasaya eklendi · ${accountName}`,
    });
    onClose();
    // Maaş yatma kutlaması — küçük bir konfeti yağmuru 🎉
    setTimeout(() => celebrateSuccess(), 100);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Maaş Yattı</DialogTitle>
          <DialogDescription>
            {incomeName} · {accountName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="salary-amount">Yatan tutar (TL)</Label>
            <Input
              id="salary-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={Number.isFinite(amount) ? amount : ''}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="h-12 text-2xl font-bold tabular-nums"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Tahmini: {defaultAmount.toLocaleString('tr-TR')} TL — gerçek
              tutara göre düzenleyebilirsin.
            </p>
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
            <Button
              type="submit"
              disabled={!Number.isFinite(amount) || amount <= 0}
              className="flex-1"
            >
              Kasaya Ekle
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
