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
import {
  useExpense,
  type ExpenseEntry,
  type ExpenseSpender,
} from './ExpenseProvider';
import { todayKey, daysAgoKey, formatTRY } from '@/lib/format';
import type { ExpenseCategory } from '@/types';
import { useCurrentUser } from '../identity/CurrentUserProvider';
import { useAllAccounts } from '@/features/custom-data/useAllAccounts';

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
  /** Mevcut harcamayı düzenleme modu için ID/data. */
  editingExpense?: ExpenseEntry;
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

/** Geçmiş 1 hafta içinde mi (bugün dahil)? */
function isWithinLastWeek(date: string): boolean {
  return date >= daysAgoKey(7) && date <= todayKey();
}

export function AddExpenseDialog({
  open,
  onClose,
  defaults,
  editingExpense,
}: Props) {
  const { addExpense, updateExpense } = useExpense();
  const { current } = useCurrentUser();
  const allAccounts = useAllAccounts();

  const isEditing = editingExpense !== undefined;

  const [spender, setSpender] = useState<ExpenseSpender>(current);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('grocery');
  const [description, setDescription] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [date, setDate] = useState<string>(() => todayKey());
  const [odometerKm, setOdometerKm] = useState<string>('');
  const [excludeFromDailyLimit, setExcludeFromDailyLimit] =
    useState<boolean>(false);

  const isFuelCategory = category === 'fuel';

  const minDate = daysAgoKey(7);
  const maxDate = todayKey();

  useEffect(() => {
    if (!open) return;

    if (editingExpense) {
      setSpender(editingExpense.spender);
      setAmount(editingExpense.amount);
      setCategory(editingExpense.category);
      setDescription(editingExpense.description ?? '');
      setAccountName(editingExpense.accountName ?? '');
      setDate(editingExpense.date);
      setOdometerKm(
        editingExpense.odometerKm != null
          ? String(editingExpense.odometerKm)
          : '',
      );
      setExcludeFromDailyLimit(editingExpense.excludeFromDailyLimit === true);
    } else {
      const initialCategory = defaults?.category ?? 'grocery';
      setSpender(defaults?.spender ?? current);
      setAmount(defaults?.amount ?? 0);
      setCategory(initialCategory);
      setDescription(defaults?.description ?? '');
      setAccountName(defaults?.accountName ?? '');
      setDate(todayKey());
      setOdometerKm('');
      // Yakıt seçilmişse default olarak limit dışı
      setExcludeFromDailyLimit(initialCategory === 'fuel');
    }
  }, [open, current, defaults, editingExpense]);

  // Kategori değişikliğinde: yakıt seçilirse exclude varsayılan true,
  // başka kategoriye geçilirse km input'u temizlenir.
  useEffect(() => {
    if (category === 'fuel') {
      setExcludeFromDailyLimit(true);
    } else {
      setOdometerKm('');
      // Diğer kategorilerde exclude flag'ini default false yap
      // (kullanıcı manuel açtıysa o kalsın — düzenleme modunda bunu bozma)
      if (!editingExpense) {
        setExcludeFromDailyLimit(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Tarih validasyonu — gelecek yasak, 1 haftadan eski yasak
    // (Düzenlemede mevcut tarih korunabilir)
    if (!isEditing && !isWithinLastWeek(date)) {
      toast.error('Geçersiz tarih', {
        description: 'Sadece son 1 hafta içindeki bir tarih seçebilirsin.',
      });
      return;
    }

    const trimmedDesc = description.trim();
    const catLabel = CATEGORIES.find((c) => c.value === category)?.label ?? '';
    const spenderLabel = spender === 'emre' ? 'Emre' : 'Sıla';

    // Yakıt için km parse — boş bırakılabilir (zorunlu değil)
    const parsedKm = odometerKm.trim()
      ? Number(odometerKm.replace(',', '.'))
      : undefined;
    const validKm =
      parsedKm != null && Number.isFinite(parsedKm) && parsedKm >= 0
        ? Math.round(parsedKm)
        : undefined;

    if (isEditing && editingExpense) {
      updateExpense(editingExpense.id, {
        spender,
        amount,
        category,
        description: trimmedDesc || undefined,
        accountName: accountName || undefined,
        date,
        excludeFromDailyLimit,
        odometerKm: validKm,
        updatedBy: current,
      });
      toast.success('Harcama güncellendi ✏️', {
        description: `${formatTRY(amount)} · ${spenderLabel} · ${catLabel}`,
      });
    } else {
      addExpense({
        spender,
        amount,
        category,
        description: trimmedDesc || undefined,
        accountName: accountName || undefined,
        date,
        excludeFromDailyLimit,
        odometerKm: validKm,
      });
      const extraNote = excludeFromDailyLimit ? ' (limit dışı)' : '';
      toast.success(`${formatTRY(amount)} harcama eklendi${extraNote}`, {
        description: `${spenderLabel} · ${catLabel}${trimmedDesc ? ` · ${trimmedDesc}` : ''}${
          validKm != null ? ` · ${validKm.toLocaleString('tr-TR')} km` : ''
        }`,
      });
    }

    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Harcama Düzenle' : 'Harcama Ekle'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Mevcut harcama bilgilerini güncelle.'
              : 'Bugün için kaydedilir; tarihi değiştirip son 1 haftaya yazabilirsin.'}
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
            <Label htmlFor="expense-date">Tarih</Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(event) => setDate(event.target.value)}
              className="h-12"
            />
            <p className="text-[11px] text-muted-foreground">
              Default bugün · sadece son 1 hafta seçilebilir · gelecek yok
            </p>
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

          {isFuelCategory && (
            <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⛽</span>
                <p className="text-xs font-semibold text-amber-300">
                  Yakıt — Günlük limit dışı
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Bu harcama günlük limit toplamına dahil edilmeyecek, sadece
                hesap bakiyesinden düşecek ve geçmişe yazılacak.
              </p>
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="odometer-km" className="text-xs">
                  Araç kilometresi (km, opsiyonel)
                </Label>
                <Input
                  id="odometer-km"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={odometerKm}
                  onChange={(event) => setOdometerKm(event.target.value)}
                  placeholder="Örn. 142500"
                />
                <p className="text-[11px] text-muted-foreground">
                  Yakıt verimliliği takibi için. Boş bırakabilirsin.
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={excludeFromDailyLimit}
                  onChange={(e) => setExcludeFromDailyLimit(e.target.checked)}
                  className="size-3.5 accent-amber-400"
                />
                Limit dışı (önerilen) — kapatırsan günlük toplama dahil olur
              </label>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description">Açıklama (opsiyonel)</Label>
            <Input
              id="description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={isFuelCategory ? 'Örn: Shell, OPET, Petrol Ofisi' : 'Örn: Migros, Shell, BIM'}
              maxLength={120}
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
                {allAccounts.map((account) => (
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
              {isEditing ? 'Güncelle' : 'Kaydet'}
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
