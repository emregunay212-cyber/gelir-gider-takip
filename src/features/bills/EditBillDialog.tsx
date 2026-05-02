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
import { useBills } from './BillsProvider';
import { formatTRY } from '@/lib/format';

interface Props {
  billName: string;
  open: boolean;
  onClose: () => void;
}

export function EditBillDialog({ billName, open, onClose }: Props) {
  const { getAmount, setAmount } = useBills();
  const [amount, setLocalAmount] = useState<number>(0);

  useEffect(() => {
    if (open) setLocalAmount(getAmount(billName));
  }, [open, billName, getAmount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount < 0) return;
    setAmount(billName, amount);
    toast.success(`${billName}: ${formatTRY(amount)} kaydedildi`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{billName}</DialogTitle>
          <DialogDescription>
            Bu faturanın aylık tutarını gir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bill-amount">Tutar (TL)</Label>
            <Input
              id="bill-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount > 0 ? amount : ''}
              onChange={(event) => setLocalAmount(Number(event.target.value))}
              className="h-12 text-2xl font-bold tabular-nums"
              autoFocus
              placeholder="0,00"
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
