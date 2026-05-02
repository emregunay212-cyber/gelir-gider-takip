import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useBills } from './BillsProvider';

interface Props {
  billName: string;
  open: boolean;
  onClose: () => void;
}

export function EditBillDialog({ billName, open, onClose }: Props) {
  const { getAmount, setAmount } = useBills();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setLocalAmount] = useState<number>(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setLocalAmount(getAmount(billName));
    }
  }, [open, billName, getAmount]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(amount) || amount < 0) return;
    setAmount(billName, amount);
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
          <h3 className="text-lg font-semibold">{billName}</h3>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Bu faturanın aylık tutarını gir.
          </p>
        </div>

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
            onChange={(event) => setLocalAmount(Number(event.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-2xl font-bold tabular-nums outline-none focus:border-[var(--color-primary)]"
            autoFocus
            placeholder="0,00"
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
      </form>
    </dialog>
  );
}
