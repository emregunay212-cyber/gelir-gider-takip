import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useIncomeOverrides } from './IncomeOverridesProvider';

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
  const dialogRef = useRef<HTMLDialogElement>(null);

  const existing = overrides[incomeName];
  const [amount, setAmount] = useState<number>(existing?.amount ?? currentAmount);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    existing?.effectiveFrom ?? '2026-08',
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

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
    onClose();
  }

  function handleRemove() {
    removeOverride(incomeName);
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
        className="flex w-[92vw] max-w-sm flex-col gap-4 p-5"
      >
        <div>
          <h3 className="text-lg font-semibold">Maaş Zammı Planla</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {incomeName} · belirtilen aydan itibaren yeni tutar geçerli olur.
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Yeni tutar (TL)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount > 0 ? amount : ''}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-2xl font-bold tabular-nums outline-none focus:border-[var(--color-primary)]"
            autoFocus
            placeholder="0,00"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Hangi aydan itibaren?
          </span>
          <input
            type="month"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-base outline-none focus:border-[var(--color-primary)]"
          />
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
            className="flex-1 rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Kaydet
          </button>
        </div>

        {existing && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-center text-xs text-[var(--color-danger)] hover:underline"
          >
            Mevcut zam planını sil
          </button>
        )}
      </form>
    </dialog>
  );
}
