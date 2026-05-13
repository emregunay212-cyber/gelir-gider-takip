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
import type { SeedAccount } from '../../db/seed';
import type { AccountOwner, AccountType } from '../../types';

const CLEANUP_FLAG = 'custom_accounts_cleanup_2026_05_v1';

/**
 * UI'dan eklenen kullanıcı tanımlı hesaplar (Sodexo Market kartı,
 * yeni banka hesabı vb).
 */

export interface CustomAccount {
  id: string;
  name: string;
  type: AccountType;
  owner: AccountOwner;
  balance: number;
  bankName?: string;
  createdAt: string;
}

interface ContextValue {
  items: readonly CustomAccount[];
  ready: boolean;
  asSeedList: () => SeedAccount[];
  add: (input: Omit<CustomAccount, 'id' | 'createdAt'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Context = createContext<ContextValue | null>(null);
const COLLECTION = 'customAccounts';

const VALID_TYPES: AccountType[] = ['bank', 'cash', 'savings', 'virtual_kasa'];
const VALID_OWNERS: AccountOwner[] = ['emre', 'sila', 'shared'];

function validate(raw: DocumentData): CustomAccount | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.balance !== 'number' ||
    typeof raw.createdAt !== 'string' ||
    !VALID_TYPES.includes(raw.type) ||
    !VALID_OWNERS.includes(raw.owner)
  ) {
    return null;
  }
  const result: CustomAccount = {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    owner: raw.owner,
    balance: raw.balance,
    createdAt: raw.createdAt,
  };
  if (typeof raw.bankName === 'string') result.bankName = raw.bankName;
  return result;
}

interface ProviderProps {
  children: ReactNode;
}

export function CustomAccountsProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove } =
    useFirestoreCollection<CustomAccount>(COLLECTION, validate);

  // 2026-05-13 cleanup: SEED_ACCOUNTS değişti, eski custom hesaplar
  // (Sodexo Market gelir kalemi vs.) tek seferlik silinir.
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
        // sessizce geç
      }
    })();
  }, [ready, items, remove]);

  const value = useMemo<ContextValue>(
    () => ({
      items,
      ready,
      asSeedList: () =>
        items.map((c) => {
          const seed: SeedAccount = {
            name: c.name,
            type: c.type,
            owner: c.owner,
            balance: c.balance,
          };
          if (c.bankName) seed.bankName = c.bankName;
          return seed;
        }),
      add: async (input) => {
        const id = safeDocId(input.name);
        const item: CustomAccount = {
          id,
          name: input.name,
          type: input.type,
          owner: input.owner,
          balance: input.balance,
          createdAt: new Date().toISOString(),
        };
        if (input.bankName) item.bankName = input.bankName;
        await upsert(item);
      },
      remove: async (id) => {
        await remove(id);
      },
    }),
    [items, ready, upsert, remove],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCustomAccounts(): ContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      'useCustomAccounts, CustomAccountsProvider içinde kullanılmalı.',
    );
  }
  return ctx;
}
