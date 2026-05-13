import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import {
  safeDocId,
  useFirestoreCollection,
} from '../../lib/firestore-helpers';

const CLEANUP_FLAG = 'accounts_cleanup_2026_05_v1';

/**
 * Hesap bakiye override — kullanıcı seed bakiye + delta hesabını
 * manuel olarak ezmek istediğinde kullanılır.
 *
 * **Semantik**: `override = mutlak bakiye`.
 *
 * - `override.setAt`'tan ÖNCE yapılan delta'lar (maaş, harcama, borç, fatura)
 *   bu hesap için yok sayılır.
 * - `override.setAt`'tan SONRA yapılan hareketler override.amount'un üstüne
 *   eklenir / çıkarılır.
 *
 * Implementasyon: delta provider'ları `balanceDelta(accountName, sinceDate?)`
 * imzasıyla `createdAt > sinceDate` (strict greater) filtresi uygular.
 *
 * Tam reset için "Sıfırla (otomatik hesap)" butonu override doc'unu siler →
 * hesap seed.balance + tüm delta'lar mantığına döner.
 */

export interface AccountOverride {
  id: string; // safeDocId(accountName)
  accountName: string;
  amount: number;
  setAt: string; // ISO timestamp
}

interface AccountOverridesContextValue {
  overrides: readonly AccountOverride[];
  ready: boolean;
  getOverride: (accountName: string) => AccountOverride | undefined;
  setOverride: (accountName: string, amount: number) => Promise<void>;
  clearOverride: (accountName: string) => Promise<void>;
}

const Context = createContext<AccountOverridesContextValue | null>(null);
const COLLECTION = 'accountOverrides';

function validate(raw: DocumentData): AccountOverride | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.accountName !== 'string' ||
    typeof raw.amount !== 'number' ||
    typeof raw.setAt !== 'string'
  ) {
    return null;
  }
  return {
    id: raw.id,
    accountName: raw.accountName,
    amount: raw.amount,
    setAt: raw.setAt,
  };
}

interface ProviderProps {
  children: ReactNode;
}

export function AccountOverridesProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove } =
    useFirestoreCollection<AccountOverride>(COLLECTION, validate);

  // 2026-05-13 cleanup: kullanıcı bakiye reset istedi, eski override'lar
  // (yanlış girilmiş manuel bakiyeler) tek seferlik silinir.
  useEffect(() => {
    if (!ready) return;
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(CLEANUP_FLAG)) return;
    if (items.length === 0) {
      localStorage.setItem(CLEANUP_FLAG, '1');
      return;
    }
    void (async () => {
      try {
        await Promise.all(items.map((item) => remove(item.id)));
        localStorage.setItem(CLEANUP_FLAG, '1');
      } catch {
        // sessizce geç — bir sonraki açılışta tekrar denenebilir
      }
    })();
  }, [ready, items, remove]);

  const value = useMemo<AccountOverridesContextValue>(
    () => ({
      overrides: items,
      ready,
      getOverride: (accountName) =>
        items.find((o) => o.accountName === accountName),
      setOverride: async (accountName, amount) => {
        const id = safeDocId(accountName);
        await upsert({
          id,
          accountName,
          amount,
          setAt: new Date().toISOString(),
        });
      },
      clearOverride: async (accountName) => {
        await remove(safeDocId(accountName));
      },
    }),
    [items, ready, upsert, remove],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAccountOverrides(): AccountOverridesContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      'useAccountOverrides, AccountOverridesProvider içinde kullanılmalı.',
    );
  }
  return ctx;
}
