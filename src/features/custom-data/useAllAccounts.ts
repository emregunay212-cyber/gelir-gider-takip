import { useMemo } from 'react';
import { SEED_ACCOUNTS, type SeedAccount } from '@/db/seed';
import { useCustomAccounts } from './CustomAccountsProvider';

/**
 * SEED_ACCOUNTS + customAccounts birleşimi.
 * Aynı isimli hesap varsa custom önce gelir (kullanıcı verisi öncelikli).
 *
 * Tüm dialog'lar (AddExpense, CashEntry, SalaryReceived, voice-parser) bu
 * hook'u kullanır — UI'dan eklenen yeni hesaplar otomatik seçilebilir hale gelir.
 */
export function useAllAccounts(): readonly SeedAccount[] {
  const { items, asSeedList } = useCustomAccounts();

  return useMemo(() => {
    const customNames = new Set(items.map((c) => c.name));
    return [
      ...asSeedList(),
      ...SEED_ACCOUNTS.filter((s) => !customNames.has(s.name)),
    ];
  }, [items, asSeedList]);
}
