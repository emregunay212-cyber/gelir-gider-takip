import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
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
import { useExpense, type ExpenseSpender } from './ExpenseProvider';
import { SEED_ACCOUNTS } from '@/db/seed';
import { todayKey, formatTRY } from '@/lib/format';
import type { ExpenseCategory } from '@/types';
import { useCurrentUser } from '../identity/CurrentUserProvider';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Sesle komut veya başka kaynaktan gelen ön doldurma değerleri. */
  defaults?: {
    amount?: number;
    category?: ExpenseCategory;
    accountName?: string;
    spender?: ExpenseSpender;
    description?: string;
  };
}

interface CategoryOption {
  value: ExpenseCategory;
  label: string;
  emoji: string;
}

const CATEGORIES: readonly CategoryOption[] = [
  { value: 'cigarette', label: 'Sigara', emoji: '🚬' },
  { value: 'food', label: 'Yemek', emoji: '🍔' },
  { value: 'grocery', label: 'Market', emoji: '🛒' },
  { value: 'fuel', label: 'Yakıt', emoji: '⛽' },
  { value: 'transport', label: 'Ulaşım', emoji: '🚌' },
  { value: 'health', label: 'Sağlık', emoji: '💊' },
  { value: 'entertainment', label: 'Eğlence', emoji: '🎬' },
  { value: 'clothing', label: 'Giyim', emoji: '👕' },
  { value: 'other', label: 'Diğer', emoji: '📋' },
];

export function AddExpenseDialog({ open, onClose, defaults }: Props) {
  const { addExpense } = useExpense();
  const { current } = useCurrentUser();

  const [spender, setSpender] = useState<ExpenseSpender>(current);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('grocery');
  const [description, setDescription] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSpender(defaults?.spender ?? current);
      setAmount(defaults?.amount ?? 0);
      setCategory(defaults?.category ?? 'grocery');
      setDescription(defaults?.description ?? '');
      setAccountName(defaults?.accountName ?? '');
    }
  }, [open, current, defaults]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) return;
    addExpense({
      spender,
      amount,
      category,
      description: description.trim() || undefined,
      accountName: accountName || undefined,
      date: todayKey(),
    });
    const catLabel = CATEGORIES.find((c) => c.value === category)?.label ?? '';
    toast.success(`${formatTRY(amount)} harcama eklendi`, {
      description: `${spender === 'emre' ? 'Emre' : 'Sıla'} · ${catLabel}${description ? ` · ${description}` : ''}`,
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Harcama Ekle</DialogTitle>
          <DialogDescription>
            Bugün için kaydedilir, günlük limitten ve kasadan düşülür.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Kim?">
            <div className="grid grid-cols-2 gap-2">
              <SpenderButton
                active={spender === 'emre'}
                onClick={() => setSpender('emre')}
                color="emre"
              >
                Emre
              </SpenderButton>
              <SpenderButton
                active={spender === 'sila'}
                onClick={() => setSpender('sila')}
                color="sila"
              >
                Sıla
              </SpenderButton>
            </div>
          </Field>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Tutar (TL)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount > 0 ? amount : ''}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="h-14 text-3xl font-bold tabular-nums"
              autoFocus
              placeholder="0,00"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select
              value={category}
              onValueChange={(v) => v && setCategory(v as ExpenseCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kategori seç" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {`${cat.emoji}  ${cat.label}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Açıklama (opsiyonel)</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Örn: Migros, Shell, BIM"
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Hangi hesaptan? (opsiyonel)</Label>
            <Select
              value={accountName || '__none__'}
              onValueChange={(v) =>
                setAccountName(!v || v === '__none__' ? '' : v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="— belirtme —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— belirtme —</SelectItem>
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
              className="flex-1"
            >
              Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

interface SpenderButtonProps {
  active: boolean;
  onClick: () => void;
  color: 'emre' | 'sila';
  children: ReactNode;
}

function SpenderButton({
  active,
  onClick,
  color,
  children,
}: SpenderButtonProps) {
  const activeClass =
    color === 'emre'
      ? 'border-[var(--color-emre)] bg-[var(--color-emre)]/10 text-[var(--color-emre)]'
      : 'border-[var(--color-sila)] bg-[var(--color-sila)]/10 text-[var(--color-sila)]';
  const inactiveClass =
    'border-input text-muted-foreground hover:bg-accent';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 px-4 py-3 text-base font-semibold transition-colors ${active ? activeClass : inactiveClass}`}
    >
      {children}
    </button>
  );
}
