import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCash, type CashEntryDirection } from './CashProvider';
import { SEED_ACCOUNTS } from '../../db/seed';
import { todayKey } from '../../lib/format';

interface Props {
  direction: CashEntryDirection;
  open: boolean;
  onClose: () => void;
}

const DIRECTION_LABEL: Record<CashEntryDirection, string> = {
  in: 'Gelen Para',
  out: 'Giden Para',
};

const DIRECTION_HELP: Record<CashEntryDirection, string> = {
  in: 'Beklenmedik gelir, hediye, iade vs. — kasaya eklenir.',
  out: 'Plan dışı gider — kasadan düşülür.',
};

export function CashEntryDialog({ direction, open, onClose }: Props) {
  const { addEntry } = useCash();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const defaultAccount =
    SEED_ACCOUNTS.find((a) => a.type === 'cash')?.name ?? SEED_ACCOUNTS[0]?.name ?? '';

  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [accountName, setAccountName] = useState<string>(defaultAccount);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setAmount(0);
      setDescription('');
      setAccountName(defaultAccount);
    }
  }, [open, defaultAccount]);

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
    onClose();
  }

  const isIncoming = direction === 'in';

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-0 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={handleSubmit}
        className="flex w-[92vw] max-w-sm flex-col gap-4 p-5"
      >
        <div>
          <h3 className="text-lg font-semibold">
            {DIRECTION_LABEL[direction]}
          </h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {DIRECTION_HELP[direction]}
          </p>
        </div>

        <label className="block text-sm">
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
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-base outline-none focus:border-[var(--color-primary)]"
            autoFocus
            placeholder="0,00"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Açıklama (opsiyonel)
          </span>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
            placeholder={isIncoming ? 'Örn: Hediye, prim, iade' : 'Örn: Acil gider, fazladan ödeme'}
            maxLength={80}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            {isIncoming ? 'Hangi hesaba?' : 'Hangi hesaptan?'}
          </span>
          <select
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
          >
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
            className="flex-1 rounded-lg border border-[var(--color-border)] py-2.5 text-sm font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!Number.isFinite(amount) || amount <= 0}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 ${
              isIncoming
                ? 'bg-[var(--color-success)]'
                : 'bg-[var(--color-danger)]'
            }`}
          >
            {isIncoming ? 'Kasaya Ekle' : 'Kasadan Düş'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
