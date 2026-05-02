import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import { SEED_RECURRING_EXPENSES } from '../../db/seed';
import { useFirestoreDocument } from '../../lib/firestore-helpers';

interface BillsState {
  amounts: Record<string, number>;
  paidByMonth: Record<string, string[]>;
}

interface BillsContextValue {
  amounts: Record<string, number>;
  getAmount: (name: string) => number;
  setAmount: (name: string, amount: number) => void;
  isPaid: (name: string, monthKey: string) => boolean;
  togglePaid: (name: string, monthKey: string) => void;
  monthlyTotal: () => number;
  monthlyPaidTotal: (monthKey: string) => number;
  monthlyPendingTotal: (monthKey: string) => number;
}

const BillsContext = createContext<BillsContextValue | null>(null);
const COLLECTION = 'state';
const DOC_ID = 'bills';
const MIGRATION_KEY = 'bills_state_migrated_v1';
const LEGACY_STORAGE_KEY = 'bills_state_v1';
const DEFAULT_STATE: BillsState = { amounts: {}, paidByMonth: {} };

function validateBillsState(raw: DocumentData): BillsState | null {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof raw.amounts !== 'object' ||
    typeof raw.paidByMonth !== 'object'
  ) {
    return null;
  }
  const amounts: Record<string, number> = {};
  Object.entries(raw.amounts as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v === 'number') amounts[k] = v;
  });
  const paidByMonth: Record<string, string[]> = {};
  Object.entries(raw.paidByMonth as Record<string, unknown>).forEach(
    ([k, v]) => {
      if (Array.isArray(v)) {
        paidByMonth[k] = v.filter((x): x is string => typeof x === 'string');
      }
    },
  );
  return { amounts, paidByMonth };
}

interface ProviderProps {
  children: ReactNode;
}

export function BillsProvider({ children }: ProviderProps) {
  const { data, ready, save } = useFirestoreDocument<BillsState>(
    COLLECTION,
    DOC_ID,
    validateBillsState,
    DEFAULT_STATE,
  );

  const state = data ?? DEFAULT_STATE;

  // Migration: localStorage'da eski bills_state_v1 varsa Firestore'a taşı
  useEffect(() => {
    if (!ready) return;
    if (localStorage.getItem(MIGRATION_KEY)) return;
    void (async () => {
      try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          const validated = validateBillsState(parsed as DocumentData);
          if (validated) {
            // Mevcut Firestore data ile merge et
            const merged: BillsState = {
              amounts: { ...validated.amounts, ...state.amounts },
              paidByMonth: { ...validated.paidByMonth, ...state.paidByMonth },
            };
            await save(merged);
          }
        }
        localStorage.setItem(MIGRATION_KEY, '1');
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // sessizce geç
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const value = useMemo<BillsContextValue>(() => {
    const getAmount = (name: string): number => {
      if (name in state.amounts) return state.amounts[name];
      const seed = SEED_RECURRING_EXPENSES.find((b) => b.name === name);
      return seed?.amount ?? 0;
    };

    return {
      amounts: state.amounts,
      getAmount,
      setAmount: (name, amount) => {
        const next: BillsState = {
          ...state,
          amounts: { ...state.amounts, [name]: amount },
        };
        void save(next);
      },
      isPaid: (name, monthKey) => {
        const list = state.paidByMonth[monthKey] ?? [];
        return list.includes(name);
      },
      togglePaid: (name, monthKey) => {
        const list = state.paidByMonth[monthKey] ?? [];
        const nextList = list.includes(name)
          ? list.filter((n) => n !== name)
          : [...list, name];
        const next: BillsState = {
          ...state,
          paidByMonth: { ...state.paidByMonth, [monthKey]: nextList },
        };
        void save(next);
      },
      monthlyTotal: () =>
        SEED_RECURRING_EXPENSES.reduce(
          (sum, bill) => sum + getAmount(bill.name),
          0,
        ),
      monthlyPaidTotal: (monthKey) => {
        const list = state.paidByMonth[monthKey] ?? [];
        return list.reduce((sum, name) => sum + getAmount(name), 0);
      },
      monthlyPendingTotal: (monthKey) => {
        const list = state.paidByMonth[monthKey] ?? [];
        return SEED_RECURRING_EXPENSES.reduce(
          (sum, bill) =>
            list.includes(bill.name) ? sum : sum + getAmount(bill.name),
          0,
        );
      },
    };
  }, [state, save]);

  return (
    <BillsContext.Provider value={value}>{children}</BillsContext.Provider>
  );
}

export function useBills(): BillsContextValue {
  const ctx = useContext(BillsContext);
  if (!ctx) {
    throw new Error('useBills, BillsProvider içinde kullanılmalı.');
  }
  return ctx;
}
