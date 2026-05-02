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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCash, type CashEntryDirection } from './CashProvider';
import { SEED_ACCOUNTS } from '@/db/seed';
import { todayKey, formatTRY } from '@/lib/format';

interface Props {
  direction: CashEntryDirection;
  open: boolean;
  onClose: () => void;
  defaultAmount?: number;
  defaultDescription?: string;
  defaultAccountName?: string;
}

const DIRECTION_LABEL: Record<CashEntryDirection, string> = {
  in: 'Gelen Para',
  out: 'Giden Para',
};

const DIRECTION_HELP: Record<CashEntryDirection, string> = {
  in: 'Beklenmedik gelir, hediye, iade vs. — kasaya eklenir.',
  out: 'Plan dışı gider — kasadan düşülür.',
};

export function CashEntryDialog({
  direction,
  open,
  onClose,
  defaultAmount,
  defaultDescription,
  defaultAccountName,
}: Props) {
  const { addEntry } = useCash();

  const fallbackAccount =
    SEED_ACCOUNTS.find((a) => a.type === 'cash')?.name ??
    SEED_ACCOUNTS[0]?.name ?? '';

  const [amount, setAmount] = useState<number>(defaultAmount ?? 0);
  const [description, setDescription] = useState<string>(defaultDescription ?? '');
  const [accountName, setAccountName] = useState<string>(
    defaultAccountName ?? fallbackAccount,
  );

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount ?? 0);
      setDescription(defaultDescription ?? '');
      setAccountName(defaultAccountName ?? fallbackAccount);
    }
  }, [
    open,
    defaultAmount,
    defaultDescription,
    defaultAccountName,
    fallbackAccount,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!accountName) return;
    addEntry({
      direction,
      amount,
      description: description.trim(),
      accountName,
      date: todayKey(),
    });
    toast.success(
      `${DIRECTION_LABEL[direction]}: ${formatTRY(amount)}`,
      {
        description: `${accountName}${description ? ` · ${description}` : ''}`,
      },
    );
    onClose();
  }

  const isIncoming = direction === 'in';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{DIRECTION_LABEL[direction]}</DialogTitle>
          <DialogDescription>{DIRECTION_HELP[direction]}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cash-amount">Tutar (TL)</Label>
            <Input
              id="cash-amount"
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
            <Label htmlFor="cash-desc">Açıklama (opsiyonel)</Label>
            <Input
              id="cash-desc"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={
                isIncoming
                  ? 'Örn: Hediye, prim, iade'
                  : 'Örn: Acil gider, fazladan ödeme'
              }
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{isIncoming ? 'Hangi hesaba?' : 'Hangi hesaptan?'}</Label>
            <Select
              value={accountName}
              onValueChange={(v) => setAccountName(v ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEED_ACCOUNTS.map((account) => (
                  <SelectItem key={account.name} value={account.name}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              variant={isIncoming ? 'default' : 'destructive'}
              className={`flex-1 ${
                isIncoming
                  ? 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/90'
                  : ''
              }`}
            >
              {isIncoming ? 'Kasaya Ekle' : 'Kasadan Düş'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
