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
import type { SeedDebt } from '../../db/seed';
import type { DebtType } from '../../types';

const VALID_TYPES: DebtType[] = [
  'fixed_installment',
  'remaining_balance',
  'interest_only',
  'personal_loan',
];

export interface CustomDebt {
  id: string;
  name: string;
  ownerKey: 'emre' | 'sila';
  type: DebtType;
  bankOrCreditor: string;
  monthlyPayment: number;
  totalInstallments?: number;
  remainingInstallments?: number;
  remainingPrincipal?: number;
  principalAmount?: number;
  monthlyInterest?: number;
  interestRate?: number;
  isPaidOff?: boolean;
  notes?: string;
  createdAt: string;
}

interface ContextValue {
  items: readonly CustomDebt[];
  ready: boolean;
  asSeedList: () => SeedDebt[];
  add: (input: Omit<CustomDebt, 'id' | 'createdAt'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Context = createContext<ContextValue | null>(null);
const COLLECTION = 'customDebts';

function validate(raw: DocumentData): CustomDebt | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.bankOrCreditor !== 'string' ||
    typeof raw.monthlyPayment !== 'number' ||
    typeof raw.createdAt !== 'string' ||
    (raw.ownerKey !== 'emre' && raw.ownerKey !== 'sila') ||
    !VALID_TYPES.includes(raw.type)
  ) {
    return null;
  }

  const result: CustomDebt = {
    id: raw.id,
    name: raw.name,
    ownerKey: raw.ownerKey,
    type: raw.type,
    bankOrCreditor: raw.bankOrCreditor,
    monthlyPayment: raw.monthlyPayment,
    createdAt: raw.createdAt,
  };
  if (typeof raw.totalInstallments === 'number')
    result.totalInstallments = raw.totalInstallments;
  if (typeof raw.remainingInstallments === 'number')
    result.remainingInstallments = raw.remainingInstallments;
  if (typeof raw.remainingPrincipal === 'number')
    result.remainingPrincipal = raw.remainingPrincipal;
  if (typeof raw.principalAmount === 'number')
    result.principalAmount = raw.principalAmount;
  if (typeof raw.monthlyInterest === 'number')
    result.monthlyInterest = raw.monthlyInterest;
  if (typeof raw.interestRate === 'number')
    result.interestRate = raw.interestRate;
  if (raw.isPaidOff === true) result.isPaidOff = true;
  if (typeof raw.notes === 'string') result.notes = raw.notes;
  return result;
}

interface ProviderProps {
  children: ReactNode;
}

export function CustomDebtsProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove } =
    useFirestoreCollection<CustomDebt>(COLLECTION, validate);

  const value = useMemo<ContextValue>(
    () => ({
      items,
      ready,
      asSeedList: () =>
        items.map((c) => {
          const seed: SeedDebt = {
            name: c.name,
            ownerKey: c.ownerKey,
            type: c.type,
            bankOrCreditor: c.bankOrCreditor,
            monthlyPayment: c.monthlyPayment,
          };
          if (c.totalInstallments != null)
            seed.totalInstallments = c.totalInstallments;
          if (c.remainingInstallments != null)
            seed.remainingInstallments = c.remainingInstallments;
          if (c.remainingPrincipal != null)
            seed.remainingPrincipal = c.remainingPrincipal;
          if (c.principalAmount != null)
            seed.principalAmount = c.principalAmount;
          if (c.monthlyInterest != null)
            seed.monthlyInterest = c.monthlyInterest;
          if (c.interestRate != null) seed.interestRate = c.interestRate;
          if (c.isPaidOff) seed.isPaidOff = c.isPaidOff;
          if (c.notes) seed.notes = c.notes;
          return seed;
        }),
      add: async (input) => {
        const id = safeDocId(input.name);
        const item: CustomDebt = {
          id,
          name: input.name,
          ownerKey: input.ownerKey,
          type: input.type,
          bankOrCreditor: input.bankOrCreditor,
          monthlyPayment: input.monthlyPayment,
          createdAt: new Date().toISOString(),
        };
        if (input.totalInstallments != null)
          item.totalInstallments = input.totalInstallments;
        if (input.remainingInstallments != null)
          item.remainingInstallments = input.remainingInstallments;
        if (input.remainingPrincipal != null)
          item.remainingPrincipal = input.remainingPrincipal;
        if (input.principalAmount != null)
          item.principalAmount = input.principalAmount;
        if (input.monthlyInterest != null)
          item.monthlyInterest = input.monthlyInterest;
        if (input.interestRate != null) item.interestRate = input.interestRate;
        if (input.isPaidOff) item.isPaidOff = input.isPaidOff;
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

export function useCustomDebts(): ContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('useCustomDebts, CustomDebtsProvider içinde kullanılmalı.');
  }
  return ctx;
}
