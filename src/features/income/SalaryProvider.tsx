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

export interface SalaryReceipt {
  id: string;             // safeDocId(incomeName, monthKey)
  incomeName: string;
  monthKey: string;
  amount: number;
  receivedAt: string;
  accountName: string;
  preExisting?: boolean;
}

interface SalaryContextValue {
  receipts: readonly SalaryReceipt[];
  isReceived: (incomeName: string, monthKey: string) => boolean;
  getReceipt: (incomeName: string, monthKey: string) => SalaryReceipt | undefined;
  addReceipt: (receipt: Omit<SalaryReceipt, 'id'>) => void;
  removeReceipt: (incomeName: string, monthKey: string) => void;
  balanceDelta: (accountName: string) => number;
  totalDelta: () => number;
}

const SalaryContext = createContext<SalaryContextValue | null>(null);
const COLLECTION = 'salaryReceipts';
const SEED_FLAG_KEY = 'salary_receipts_seeded_fs_v1';
const MIGRATION_KEY = 'salary_receipts_migrated_v1';
const LEGACY_STORAGE_KEY = 'salary_receipts_v1';

const SEED_RECEIPTS: readonly SalaryReceipt[] = [
  {
    id: safeDocId('Emre Maaş', '2026-05'),
    incomeName: 'Emre Maaş',
    monthKey: '2026-05',
    amount: 43000,
    accountName: 'Emre Garanti',
    receivedAt: '2026-05-01T00:00:00.000Z',
    preExisting: true,
  },
];

function validateSalaryReceipt(raw: DocumentData): SalaryReceipt | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.incomeName !== 'string' ||
    typeof raw.monthKey !== 'string' ||
    typeof raw.amount !== 'number' ||
    typeof raw.accountName !== 'string' ||
    typeof raw.receivedAt !== 'string'
  ) {
    return null;
  }
  return {
    id: raw.id,
    incomeName: raw.incomeName,
    monthKey: raw.monthKey,
    amount: raw.amount,
    accountName: raw.accountName,
    receivedAt: raw.receivedAt,
    preExisting: raw.preExisting === true,
  };
}

interface ProviderProps {
  children: ReactNode;
}

export function SalaryProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove, upsertMany } =
    useFirestoreCollection<SalaryReceipt>(COLLECTION, validateSalaryReceipt);

  // Migration: önceki localStorage verilerini Firestore'a taşı + seed yükle
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    void (async () => {
      // Eski localStorage verisini Firestore'a yükle
      if (!localStorage.getItem(MIGRATION_KEY)) {
        try {
          const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
          if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const valid: SalaryReceipt[] = [];
              for (const p of parsed) {
                if (typeof p !== 'object' || p === null) continue;
                const obj = p as Record<string, unknown>;
                if (
                  typeof obj.incomeName !== 'string' ||
                  typeof obj.monthKey !== 'string' ||
                  typeof obj.amount !== 'number' ||
                  typeof obj.accountName !== 'string'
                ) {
                  continue;
                }
                const receipt: SalaryReceipt = {
                  id: safeDocId(obj.incomeName, obj.monthKey),
                  incomeName: obj.incomeName,
                  monthKey: obj.monthKey,
                  amount: obj.amount,
                  accountName: obj.accountName,
                  receivedAt:
                    typeof obj.receivedAt === 'string'
                      ? obj.receivedAt
                      : new Date().toISOString(),
                };
                if (obj.preExisting === true) receipt.preExisting = true;
                valid.push(receipt);
              }
              if (valid.length > 0) await upsertMany(valid);
            }
          }
          localStorage.setItem(MIGRATION_KEY, '1');
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          localStorage.removeItem('salary_receipts_seeded_v1');
        } catch {
          // sessizce geç
        }
      }

      // Seed: koleksiyonda hiç receipt yoksa Emre Maaş seed'ini yükle
      if (!cancelled && !localStorage.getItem(SEED_FLAG_KEY)) {
        if (items.length === 0) {
          await upsertMany(SEED_RECEIPTS).catch(() => undefined);
        }
        localStorage.setItem(SEED_FLAG_KEY, '1');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, items.length, upsertMany]);

  const value = useMemo<SalaryContextValue>(
    () => ({
      receipts: items,
      isReceived: (incomeName, monthKey) =>
        items.some(
          (r) => r.incomeName === incomeName && r.monthKey === monthKey,
        ),
      getReceipt: (incomeName, monthKey) =>
        items.find(
          (r) => r.incomeName === incomeName && r.monthKey === monthKey,
        ),
      addReceipt: (input) => {
        const id = safeDocId(input.incomeName, input.monthKey);
        void upsert({ ...input, id });
      },
      removeReceipt: (incomeName, monthKey) => {
        void remove(safeDocId(incomeName, monthKey));
      },
      balanceDelta: (accountName) =>
        items
          .filter((r) => r.accountName === accountName && !r.preExisting)
          .reduce((sum, r) => sum + r.amount, 0),
      totalDelta: () =>
        items
          .filter((r) => !r.preExisting)
          .reduce((sum, r) => sum + r.amount, 0),
    }),
    [items, upsert, remove],
  );

  return (
    <SalaryContext.Provider value={value}>{children}</SalaryContext.Provider>
  );
}

export function useSalary(): SalaryContextValue {
  const ctx = useContext(SalaryContext);
  if (!ctx) {
    throw new Error('useSalary, SalaryProvider içinde kullanılmalı.');
  }
  return ctx;
}
