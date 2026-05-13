import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import { useFirestoreCollection } from '../../lib/firestore-helpers';

export type CashEntryDirection = 'in' | 'out';

export interface CashEntry {
  id: string;
  direction: CashEntryDirection;
  amount: number;
  description: string;
  accountName: string;
  date: string;
  createdAt: string;
}

interface CashContextValue {
  entries: readonly CashEntry[];
  addEntry: (input: Omit<CashEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  /** Silinen kayıt snapshot'ını aynı ID ile geri yükler (undo). */
  restoreEntry: (entry: CashEntry) => void;
  /**
   * @param sinceDate - ISO timestamp. Verilirse o tarihten SONRA (strict >)
   * yapılan hareketleri sayar. Override mantığı için kullanılır.
   */
  balanceDelta: (accountName: string, sinceDate?: string) => number;
  totalDelta: () => number;
}

const CashContext = createContext<CashContextValue | null>(null);
const COLLECTION = 'cashEntries';
const MIGRATION_KEY = 'cash_entries_migrated_v1';
const LEGACY_STORAGE_KEY = 'cash_entries_v1';

function generateId(): string {
  return `cash_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function validateCashEntry(raw: DocumentData): CashEntry | null {
  if (
    typeof raw.id !== 'string' ||
    (raw.direction !== 'in' && raw.direction !== 'out') ||
    typeof raw.amount !== 'number' ||
    typeof raw.accountName !== 'string'
  ) {
    return null;
  }
  return {
    id: raw.id,
    direction: raw.direction,
    amount: raw.amount,
    description: typeof raw.description === 'string' ? raw.description : '',
    accountName: raw.accountName,
    date: typeof raw.date === 'string' ? raw.date : '',
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

interface ProviderProps {
  children: ReactNode;
}

export function CashProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove, upsertMany } =
    useFirestoreCollection<CashEntry>(COLLECTION, validateCashEntry);

  useEffect(() => {
    if (!ready) return;
    if (localStorage.getItem(MIGRATION_KEY)) return;
    void (async () => {
      try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const valid = parsed
              .map((p): CashEntry | null => {
                if (typeof p !== 'object' || p === null) return null;
                const o = p as Record<string, unknown>;
                if (
                  typeof o.id !== 'string' ||
                  (o.direction !== 'in' && o.direction !== 'out') ||
                  typeof o.amount !== 'number' ||
                  typeof o.accountName !== 'string'
                ) {
                  return null;
                }
                return {
                  id: o.id,
                  direction: o.direction,
                  amount: o.amount,
                  description:
                    typeof o.description === 'string' ? o.description : '',
                  accountName: o.accountName,
                  date: typeof o.date === 'string' ? o.date : '',
                  createdAt:
                    typeof o.createdAt === 'string'
                      ? o.createdAt
                      : new Date().toISOString(),
                };
              })
              .filter((e): e is CashEntry => e !== null);
            if (valid.length > 0) await upsertMany(valid);
          }
        }
        localStorage.setItem(MIGRATION_KEY, '1');
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // sessizce geç
      }
    })();
  }, [ready, upsertMany]);

  const value = useMemo<CashContextValue>(
    () => ({
      entries: items,
      addEntry: (input) => {
        const entry: CashEntry = {
          ...input,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        void upsert(entry);
      },
      removeEntry: (id) => {
        void remove(id);
      },
      restoreEntry: (entry) => {
        void upsert(entry);
      },
      balanceDelta: (accountName, sinceDate) =>
        items
          .filter(
            (e) =>
              e.accountName === accountName &&
              (sinceDate ? e.createdAt > sinceDate : true),
          )
          .reduce(
            (sum, e) => sum + (e.direction === 'in' ? e.amount : -e.amount),
            0,
          ),
      totalDelta: () =>
        items.reduce(
          (sum, e) => sum + (e.direction === 'in' ? e.amount : -e.amount),
          0,
        ),
    }),
    [items, upsert, remove],
  );

  return <CashContext.Provider value={value}>{children}</CashContext.Provider>;
}

export function useCash(): CashContextValue {
  const ctx = useContext(CashContext);
  if (!ctx) {
    throw new Error('useCash, CashProvider içinde kullanılmalı.');
  }
  return ctx;
}
