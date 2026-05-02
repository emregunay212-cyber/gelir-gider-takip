import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useExpense, type ExpenseSpender } from './ExpenseProvider';
import { SEED_ACCOUNTS } from '../../db/seed';
import { todayKey } from '../../lib/format';
import type { ExpenseCategory } from '../../types';
import { useCurrentUser } from '../identity/CurrentUserProvider';

interface Props {
  open: boolean;
  onClose: () => void;
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

export function AddExpenseDialog({ open, onClose }: Props) {
  const { addExpense } = useExpense();
  const { current } = useCurrentUser();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [spender, setSpender] = useState<ExpenseSpender>(current);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>('grocery');
  const [description, setDescription] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setSpender(current);
      setAmount(0);
      setDescription('');
      setAccountName('');
    }
  }, [open, current]);

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
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-[92vw] max-w-md flex-col gap-4 p-5"
      >
        <div>
          <h3 className="text-lg font-semibold">Harcama Ekle</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Bugün için kaydedilir, günlük limitten ve kasadan düşülür.
          </p>
        </div>

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

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Tutar (TL)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount > 0 ? amount : ''}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-3xl font-bold tabular-nums outline-none focus:border-[var(--color-primary)]"
            autoFocus
            placeholder="0,00"
          />
        </label>

        <Field label="Kategori">
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {cat.emoji}
                </span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Açıklama (opsiyonel)
          </span>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
            placeholder="Örn: Migros, Shell, BIM"
            maxLength={80}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Hangi hesaptan? (opsiyonel)
          </span>
          <select
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">— belirtme —</option>
            {SEED_ACCOUNTS.map((account) => (
              <option key={account.name} value={account.name}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!Number.isFinite(amount) || amount <= 0}
            className="flex-1 rounded-lg bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </form>
    </dialog>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium text-[var(--color-muted)]">
        {label}
      </span>
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
    'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]';
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
