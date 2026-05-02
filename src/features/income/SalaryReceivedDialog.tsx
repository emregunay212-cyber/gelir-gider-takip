import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSalary } from './SalaryProvider';
import { monthKey } from '../../lib/format';

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState<number>(defaultAmount);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    setAmount(defaultAmount);
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
          <h3 className="text-lg font-semibold">Maaş Yattı</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {incomeName} · {accountName}
          </p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-[var(--color-muted)]">
            Yatan tutar (TL)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={Number.isFinite(amount) ? amount : ''}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-base outline-none focus:border-[var(--color-primary)]"
            autoFocus
          />
          <span className="mt-1 block text-[11px] text-[var(--color-muted)]">
            Tahmini: {defaultAmount.toLocaleString('tr-TR')} TL — gerçek yatan
            tutara göre düzenleyebilirsin.
          </span>
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
            className="flex-1 rounded-lg bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            disabled={!Number.isFinite(amount) || amount <= 0}
          >
            Kasaya Ekle
          </button>
        </div>
      </form>
    </dialog>
  );
}
