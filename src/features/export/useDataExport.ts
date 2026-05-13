import { useExpense } from '../expense/ExpenseProvider';
import { useCash } from '../cash/CashProvider';
import { useSalary } from '../income/SalaryProvider';
import { useBills } from '../bills/BillsProvider';
import { useBillPayment } from '../bills/BillPaymentProvider';
import { useDebtPayment } from '../debt/DebtPaymentProvider';

interface ExportPayload {
  exportedAt: string;
  app: 'aile-butce';
  version: 2;
  range?: { from?: string; to?: string };
  expenses: unknown[];
  cashEntries: unknown[];
  salaryReceipts: unknown[];
  billAmounts: Record<string, number>;
  billPayments: unknown[];
  debtPayments: unknown[];
}

export interface ExportDateRange {
  /** YYYY-MM-DD — bu tarih dahil */
  from?: string;
  /** YYYY-MM-DD — bu tarih dahil */
  to?: string;
}

export function useDataExport() {
  const { entries: expenses } = useExpense();
  const { entries: cashEntries } = useCash();
  const { receipts: salaryReceipts } = useSalary();
  const { amounts } = useBills();
  const { payments: billPayments } = useBillPayment();
  const { payments: debtPayments } = useDebtPayment();

  function inDateRange(dateStr: string, range?: ExportDateRange): boolean {
    if (!range) return true;
    if (range.from && dateStr < range.from) return false;
    if (range.to && dateStr > range.to) return false;
    return true;
  }

  function downloadJson(range?: ExportDateRange): void {
    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      app: 'aile-butce',
      version: 2,
      range,
      expenses: expenses.filter((e) => inDateRange(e.date, range)),
      cashEntries: cashEntries.filter((e) => inDateRange(e.date, range)),
      salaryReceipts: [...salaryReceipts],
      billAmounts: { ...amounts },
      billPayments: [...billPayments],
      debtPayments: [...debtPayments],
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `aile-butce-yedek-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadExpensesCsv(range?: ExportDateRange): void {
    const headers = [
      'tarih',
      'kim',
      'kategori',
      'tutar_tl',
      'aciklama',
      'hesap',
    ];
    const rows = expenses
      .filter((e) => inDateRange(e.date, range))
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => [
        e.date,
        e.spender === 'emre' ? 'Emre' : 'Sıla',
        e.category,
        e.amount.toFixed(2).replace('.', ','),
        (e.description ?? '').replace(/"/g, '""'),
        (e.accountName ?? '').replace(/"/g, '""'),
      ]);

    const lines = [
      headers.join(';'),
      ...rows.map((cells) =>
        cells
          .map((c) => (c.includes(';') || c.includes('"') ? `"${c}"` : c))
          .join(';'),
      ),
    ];
    const csv = '﻿' + lines.join('\r\n'); // BOM + CRLF (Excel uyumu)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `aile-butce-harcamalar-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return { downloadJson, downloadExpensesCsv };
}
