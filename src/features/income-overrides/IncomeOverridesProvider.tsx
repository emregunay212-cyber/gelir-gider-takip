import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import { useFirestoreDocument } from '../../lib/firestore-helpers';

// Gelir override'ları (örn: Emre maaşı için Ağustos zammı planı).
// effectiveFrom = "2026-08" → bu aydan itibaren amount geçerli.
export interface IncomeOverride {
  effectiveFrom: string;  // YYYY-MM
  amount: number;
  note?: string;
}

interface OverridesState {
  overrides: Record<string, IncomeOverride>; // key: income name
}

interface IncomeOverridesContextValue {
  overrides: Record<string, IncomeOverride>;
  setOverride: (incomeName: string, override: IncomeOverride) => void;
  removeOverride: (incomeName: string) => void;
  resolveAmount: (incomeName: string, baseAmount: number, monthKey: string) => number;
}

const IncomeOverridesContext =
  createContext<IncomeOverridesContextValue | null>(null);
const COLLECTION = 'state';
const DOC_ID = 'incomeOverrides';
const DEFAULT_STATE: OverridesState = { overrides: {} };

function validate(raw: DocumentData): OverridesState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  if (typeof raw.overrides !== 'object' || raw.overrides === null) {
    return null;
  }
  const overrides: Record<string, IncomeOverride> = {};
  Object.entries(raw.overrides as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v !== 'object' || v === null) return;
    const o = v as Record<string, unknown>;
    if (typeof o.effectiveFrom !== 'string' || typeof o.amount !== 'number') {
      return;
    }
    const item: IncomeOverride = {
      effectiveFrom: o.effectiveFrom,
      amount: o.amount,
    };
    if (typeof o.note === 'string') item.note = o.note;
    overrides[k] = item;
  });
  return { overrides };
}

interface ProviderProps {
  children: ReactNode;
}

export function IncomeOverridesProvider({ children }: ProviderProps) {
  const { data, ready, save } = useFirestoreDocument<OverridesState>(
    COLLECTION,
    DOC_ID,
    validate,
    DEFAULT_STATE,
  );

  // Touch ready to satisfy lint; Provider çalışmaya başlasa da boş state ile başlar
  useEffect(() => {
    void ready;
  }, [ready]);

  const state = data ?? DEFAULT_STATE;

  const value = useMemo<IncomeOverridesContextValue>(
    () => ({
      overrides: state.overrides,
      setOverride: (incomeName, override) => {
        const next: OverridesState = {
          overrides: { ...state.overrides, [incomeName]: override },
        };
        void save(next);
      },
      removeOverride: (incomeName) => {
        const nextOverrides = { ...state.overrides };
        delete nextOverrides[incomeName];
        void save({ overrides: nextOverrides });
      },
      resolveAmount: (incomeName, baseAmount, monthKey) => {
        const override = state.overrides[incomeName];
        if (!override) return baseAmount;
        if (monthKey >= override.effectiveFrom) return override.amount;
        return baseAmount;
      },
    }),
    [state, save],
  );

  return (
    <IncomeOverridesContext.Provider value={value}>
      {children}
    </IncomeOverridesContext.Provider>
  );
}

export function useIncomeOverrides(): IncomeOverridesContextValue {
  const ctx = useContext(IncomeOverridesContext);
  if (!ctx) {
    throw new Error(
      'useIncomeOverrides, IncomeOverridesProvider içinde kullanılmalı.',
    );
  }
  return ctx;
}
