import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import { toast } from 'sonner';
import type { ExpenseCategory } from '../../types';
import { useFirestoreCollection } from '../../lib/firestore-helpers';
import { useToday } from '../../hooks/useToday';

export type ExpenseSpender = 'emre' | 'sila';

export interface ExpenseEntry {
  id: string;
  spender: ExpenseSpender;
  date: string;
  amount: number;
  category: ExpenseCategory;
  description?: string;
  accountName?: string;
  createdAt: string;
}

interface ExpenseContextValue {
  entries: readonly ExpenseEntry[];
  addExpense: (input: Omit<ExpenseEntry, 'id' | 'createdAt'>) => void;
  removeExpense: (id: string) => void;
  todaysExpenses: () => readonly ExpenseEntry[];
  todaysTotal: () => number;
  totalForDate: (date: string) => number;
  totalDelta: () => number;
  monthlyTotal: (month: string) => number;
  /**
   * Aylık net tasarruf:
   * (geçen gün sayısı × dailyLimit) − bu ayın toplam harcaması.
   * Pozitif = limit altında kaldık (tasarruf), negatif = aşım var.
   */
  monthlySavings: (month: string, dailyLimit: number) => number;
  balanceDelta: (accountName: string) => number;
}

const ExpenseContext = createContext<ExpenseContextValue | null>(null);
const COLLECTION = 'expenses';
const MIGRATION_KEY = 'expense_entries_migrated_v1';
const LEGACY_STORAGE_KEY = 'expense_entries_v1';

const VALID_CATEGORIES = new Set<ExpenseCategory>([
  'food',
  'grocery',
  'fuel',
  'transport',
  'health',
  'clothing',
  'entertainment',
  'cigarette',
  'bill',
  'other',
]);

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function validateExpenseEntry(raw: DocumentData): ExpenseEntry | null {
  if (
    typeof raw.id !== 'string' ||
    (raw.spender !== 'emre' && raw.spender !== 'sila') ||
    typeof raw.date !== 'string' ||
    typeof raw.amount !== 'number' ||
    typeof raw.category !== 'string' ||
    !VALID_CATEGORIES.has(raw.category as ExpenseCategory)
  ) {
    return null;
  }
  const entry: ExpenseEntry = {
    id: raw.id,
    spender: raw.spender,
    date: raw.date,
    amount: raw.amount,
    category: raw.category as ExpenseCategory,
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : new Date().toISOString(),
  };
  if (typeof raw.description === 'string' && raw.description.length > 0) {
    entry.description = raw.description;
  }
  if (typeof raw.accountName === 'string' && raw.accountName.length > 0) {
    entry.accountName = raw.accountName;
  }
  return entry;
}

interface ProviderProps {
  children: ReactNode;
}

export function ExpenseProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove, upsertMany } =
    useFirestoreCollection<ExpenseEntry>(COLLECTION, validateExpenseEntry);
  const today = useToday();

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
              .map((p): ExpenseEntry | null => {
                if (typeof p !== 'object' || p === null) return null;
                const o = p as Record<string, unknown>;
                if (
                  typeof o.id !== 'string' ||
                  (o.spender !== 'emre' && o.spender !== 'sila') ||
                  typeof o.date !== 'string' ||
                  typeof o.amount !== 'number' ||
                  typeof o.category !== 'string' ||
                  !VALID_CATEGORIES.has(o.category as ExpenseCategory)
                ) {
                  return null;
                }
                const entry: ExpenseEntry = {
                  id: o.id,
                  spender: o.spender,
                  date: o.date,
                  amount: o.amount,
                  category: o.category as ExpenseCategory,
                  createdAt:
                    typeof o.createdAt === 'string'
                      ? o.createdAt
                      : new Date().toISOString(),
                };
                if (typeof o.description === 'string') entry.description = o.description;
                if (typeof o.accountName === 'string') entry.accountName = o.accountName;
                return entry;
              })
              .filter((e): e is ExpenseEntry => e !== null);
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

  const value = useMemo<ExpenseContextValue>(() => {
    const todaysList = items.filter((e) => e.date === today);
    const totalAll = items.reduce((s, e) => s + e.amount, 0);
    return {
      entries: items,
      addExpense: (input) => {
        const entry: ExpenseEntry = {
          id: generateId(),
          spender: input.spender,
          date: input.date,
          amount: input.amount,
          category: input.category,
          createdAt: new Date().toISOString(),
        };
        // Opsiyonel alanları yalnızca dolu olduklarında ekle (Firestore undefined kabul etmez)
        if (input.description) entry.description = input.description;
        if (input.accountName) entry.accountName = input.accountName;

        upsert(entry).catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Bilinmeyen hata';
          toast.error('Harcama kaydedilemedi', { description: message });
        });
      },
      removeExpense: (id) => {
        remove(id).catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : 'Bilinmeyen hata';
          toast.error('Silinemedi', { description: message });
        });
      },
      todaysExpenses: () => todaysList,
      todaysTotal: () => todaysList.reduce((s, e) => s + e.amount, 0),
      totalForDate: (date) =>
        items.filter((e) => e.date === date).reduce((s, e) => s + e.amount, 0),
      totalDelta: () => totalAll,
      monthlyTotal: (month) =>
        items
          .filter((e) => e.date.startsWith(month))
          .reduce((s, e) => s + e.amount, 0),
      monthlySavings: (month, dailyLimit) => {
        const [yearStr, monthNumStr] = month.split('-');
        const year = Number(yearStr);
        const monthNum = Number(monthNumStr);
        const todayMonth = today.slice(0, 7);

        let daysCount: number;
        if (month === todayMonth) {
          // Mevcut ay: bugün dahil geçen gün sayısı
          daysCount = Number(today.slice(8, 10));
        } else if (month < todayMonth) {
          // Geçmiş ay: tüm gün sayısı
          daysCount = new Date(year, monthNum, 0).getDate();
        } else {
          // Gelecek ay: henüz başlamadı
          daysCount = 0;
        }

        const monthlyBudget = dailyLimit * daysCount;
        const totalSpent = items
          .filter((e) => e.date.startsWith(month))
          .reduce((s, e) => s + e.amount, 0);

        return monthlyBudget - totalSpent;
      },
      balanceDelta: (accountName) =>
        items
          .filter((e) => e.accountName === accountName)
          .reduce((s, e) => s + e.amount, 0),
    };
  }, [items, today, upsert, remove]);

  return (
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
  );
}

export function useExpense(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext);
  if (!ctx) {
    throw new Error('useExpense, ExpenseProvider içinde kullanılmalı.');
  }
  return ctx;
}
