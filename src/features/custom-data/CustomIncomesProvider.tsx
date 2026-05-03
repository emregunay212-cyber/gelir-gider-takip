import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import {
  safeDocId,
  useFirestoreCollection,
} from '../../lib/firestore-helpers';
import type { SeedIncome } from '../../db/seed';

/**
 * Kullanıcının UI üzerinden eklediği özel gelir kaynakları.
 * SEED_INCOMES (kod ile sabit) + customIncomes (Firestore) birleştirilerek
 * tüm uygulamada gösterilir.
 *
 * Sodexo gibi yan haklar artık seed.ts düzenlemeden, "Yeni Gelir" butonuyla
 * eklenebilir.
 */

export interface CustomIncome {
  id: string;
  name: string;
  ownerKey: 'emre' | 'sila';
  category: 'salary' | 'side_income' | 'bonus' | 'other';
  frequency: 'monthly' | 'one_time' | 'seasonal_range';
  amountFixed?: number;
  amountMin?: number;
  amountMax?: number;
  dayOfMonth?: number;
  notes?: string;
  createdAt: string;
}

interface ContextValue {
  items: readonly CustomIncome[];
  ready: boolean;
  /** SEED_INCOMES + custom birleşimi — tüketici komponentler bunu kullanır. */
  asSeedList: () => SeedIncome[];
  add: (input: Omit<CustomIncome, 'id' | 'createdAt'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Context = createContext<ContextValue | null>(null);
const COLLECTION = 'customIncomes';

function validate(raw: DocumentData): CustomIncome | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.createdAt !== 'string' ||
    (raw.ownerKey !== 'emre' && raw.ownerKey !== 'sila') ||
    (raw.category !== 'salary' &&
      raw.category !== 'side_income' &&
      raw.category !== 'bonus' &&
      raw.category !== 'other') ||
    (raw.frequency !== 'monthly' &&
      raw.frequency !== 'one_time' &&
      raw.frequency !== 'seasonal_range')
  ) {
    return null;
  }

  const result: CustomIncome = {
    id: raw.id,
    name: raw.name,
    ownerKey: raw.ownerKey,
    category: raw.category,
    frequency: raw.frequency,
    createdAt: raw.createdAt,
  };
  if (typeof raw.amountFixed === 'number') result.amountFixed = raw.amountFixed;
  if (typeof raw.amountMin === 'number') result.amountMin = raw.amountMin;
  if (typeof raw.amountMax === 'number') result.amountMax = raw.amountMax;
  if (typeof raw.dayOfMonth === 'number') result.dayOfMonth = raw.dayOfMonth;
  if (typeof raw.notes === 'string') result.notes = raw.notes;
  return result;
}

interface ProviderProps {
  children: ReactNode;
}

export function CustomIncomesProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove } =
    useFirestoreCollection<CustomIncome>(COLLECTION, validate);

  const value = useMemo<ContextValue>(
    () => ({
      items,
      ready,
      asSeedList: () =>
        items.map((c) => {
          const s: SeedIncome = {
            name: c.name,
            ownerKey: c.ownerKey,
            category: c.category,
            frequency: c.frequency,
          };
          if (c.amountFixed != null) s.amountFixed = c.amountFixed;
          if (c.amountMin != null) s.amountMin = c.amountMin;
          if (c.amountMax != null) s.amountMax = c.amountMax;
          if (c.dayOfMonth != null) s.dayOfMonth = c.dayOfMonth;
          if (c.notes) s.notes = c.notes;
          return s;
        }),
      add: async (input) => {
        const id = safeDocId(input.name);
        const item: CustomIncome = {
          id,
          name: input.name,
          ownerKey: input.ownerKey,
          category: input.category,
          frequency: input.frequency,
          createdAt: new Date().toISOString(),
        };
        if (input.amountFixed != null) item.amountFixed = input.amountFixed;
        if (input.amountMin != null) item.amountMin = input.amountMin;
        if (input.amountMax != null) item.amountMax = input.amountMax;
        if (input.dayOfMonth != null) item.dayOfMonth = input.dayOfMonth;
        if (input.notes) item.notes = input.notes;
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

export function useCustomIncomes(): ContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error(
      'useCustomIncomes, CustomIncomesProvider içinde kullanılmalı.',
    );
  }
  return ctx;
}
