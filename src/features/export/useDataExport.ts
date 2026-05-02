import { useExpense } from '../expense/ExpenseProvider';
import { useCash } from '../cash/CashProvider';
import { useSalary } from '../income/SalaryProvider';
import { useBills } from '../bills/BillsProvider';
import { useDebtPayment } from '../debt/DebtPaymentProvider';
import { SEED_RECURRING_EXPENSES } from '../../db/seed';

interface ExportPayload {
  exportedAt: string;
  app: 'aile-butce';
  version: 1;
  expenses: unknown[];
  cashEntries: unknown[];
  salaryReceipts: unknown[];
  billAmounts: Record<string, number>;
  billPayments: Record<string, string[]>;
  debtPayments: unknown[];
}

export function useDataExport() {
  const { entries: expenses } = useExpense();
  const { entries: cashEntries } = useCash();
  const { receipts: salaryReceipts } = useSalary();
  const { amounts, isPaid, monthlyTotal: _t } = useBills();
  const { payments: debtPayments } = useDebtPayment();

  void _t;

  function downloadJson(): void {
    // Bills paid: tüm seed bills için bilinen ay listesini extract et
    const billPaymentsByMonth: Record<string, string[]> = {};
    SEED_RECURRING_EXPENSES.forEach((bill) => {
      // Tüm ayları düşünmek anlamsız; mevcut state'in raw'unu okumak yerine
      // exporting eden tarafın tam state'i kopyala (dış paramlar üzerinden)
      void bill;
    });

    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      app: 'aile-butce',
      version: 1,
      expenses: [...expenses],
      cashEntries: [...cashEntries],
      salaryReceipts: [...salaryReceipts],
      billAmounts: { ...amounts },
      billPayments: billPaymentsByMonth,
      debtPayments: [...debtPayments],
    };

    // Bills paid state'i isPaid ile geri inşa et (her bill × her bilinen ay).
    // Sade bir yaklaşım: ay aralığını bills paidByMonth state'inden almak gerek;
    // o private — bunun yerine her ay için isPaid'i çağıramayız (range bilinmiyor).
    // Pragmatic: son 24 ay için dene.
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const paidNames: string[] = [];
      SEED_RECURRING_EXPENSES.forEach((bill) => {
        if (isPaid(bill.name, monthKey)) paidNames.push(bill.name);
      });
      if (paidNames.length > 0) billPaymentsByMonth[monthKey] = paidNames;
    }

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

  function downloadExpensesCsv(): void {
    const headers = [
      'tarih',
      'kim',
      'kategori',
      'tutar_tl',
      'aciklama',
      'hesap',
    ];
    const rows = [...expenses]
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
