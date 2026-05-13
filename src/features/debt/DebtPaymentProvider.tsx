import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import { SEED_DEBTS } from '../../db/seed';
import {
  safeDocId,
  useFirestoreCollection,
} from '../../lib/firestore-helpers';

export interface DebtPayment {
  id: string;                // safeDocId(debtName, monthKey)
  debtName: string;
  monthKey: string;
  paidAt: string;
  accountName?: string;
}

interface DebtPaymentContextValue {
  payments: readonly DebtPayment[];
  isPaid: (debtName: string, monthKey: string) => boolean;
  markPaid: (debtName: string, monthKey: string, accountName?: string) => void;
  unmarkPaid: (debtName: string, monthKey: string) => void;
  paymentCount: (debtName: string) => number;
  /** Borç için ödenmiş ay anahtarları (sıralı) — UI'da ileri ödeme için. */
  paymentMonths: (debtName: string) => string[];
  remainingInstallments: (debtName: string) => number | undefined;
  effectivePrincipal: (debtName: string) => number | undefined;
  isClosedByPayments: (debtName: string) => boolean;
  monthlyPaidTotal: (monthKey: string) => number;
  monthlyPendingTotal: (monthKey: string) => number;
  /**
   * @param sinceDate - ISO timestamp. Verilirse o tarihten SONRA (strict >)
   * yapılan borç ödemelerini sayar. Override mantığı için kullanılır.
   */
  balanceDelta: (accountName: string, sinceDate?: string) => number;
  totalDelta: () => number;
}

const DebtPaymentContext = createContext<DebtPaymentContextValue | null>(null);
const COLLECTION = 'debtPayments';
const SEED_FLAG_KEY = 'debt_payments_seeded_fs_v1';
const MIGRATION_KEY = 'debt_payments_migrated_v1';
const LEGACY_STORAGE_KEY = 'debt_payments_v1';

const UNPAID_IN_MAY = new Set<string>(['Mehmet Enişte Borç', 'Evkur']);

const SEED_PAYMENTS: readonly DebtPayment[] = SEED_DEBTS
  .filter((d) => !UNPAID_IN_MAY.has(d.name))
  .map((d) => ({
    id: safeDocId(d.name, '2026-05'),
    debtName: d.name,
    monthKey: '2026-05',
    paidAt: '2026-05-01T00:00:00.000Z',
  }));

function validateDebtPayment(raw: DocumentData): DebtPayment | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.debtName !== 'string' ||
    typeof raw.monthKey !== 'string' ||
    typeof raw.paidAt !== 'string'
  ) {
    return null;
  }
  const payment: DebtPayment = {
    id: raw.id,
    debtName: raw.debtName,
    monthKey: raw.monthKey,
    paidAt: raw.paidAt,
  };
  if (typeof raw.accountName === 'string' && raw.accountName.length > 0) {
    payment.accountName = raw.accountName;
  }
  return payment;
}

interface ProviderProps {
  children: ReactNode;
}

export function DebtPaymentProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove, upsertMany } =
    useFirestoreCollection<DebtPayment>(COLLECTION, validateDebtPayment);

  // Migration: önceki localStorage'daki payment'ları Firestore'a taşı + seed yükle
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
              const valid = parsed
                .map((p): DebtPayment | null => {
                  if (typeof p !== 'object' || p === null) return null;
                  const o = p as Record<string, unknown>;
                  if (
                    typeof o.debtName !== 'string' ||
                    typeof o.monthKey !== 'string'
                  ) {
                    return null;
                  }
                  // Eski payment'larda Mayıs için Evkur/Mehmet varsa atla (migration düzeltme)
                  if (
                    o.monthKey === '2026-05' &&
                    UNPAID_IN_MAY.has(o.debtName)
                  ) {
                    return null;
                  }
                  return {
                    id: safeDocId(o.debtName, o.monthKey),
                    debtName: o.debtName,
                    monthKey: o.monthKey,
                    paidAt:
                      typeof o.paidAt === 'string'
                        ? o.paidAt
                        : new Date().toISOString(),
                    accountName:
                      typeof o.accountName === 'string'
                        ? o.accountName
                        : undefined,
                  };
                })
                .filter((p): p is DebtPayment => p !== null);
              if (valid.length > 0) await upsertMany(valid);
            }
          }
          localStorage.setItem(MIGRATION_KEY, '1');
          localStorage.removeItem(LEGACY_STORAGE_KEY);
          localStorage.removeItem('debt_payments_seeded_v1');
          localStorage.removeItem('debt_payments_unmark_v1');
        } catch {
          // sessizce geç
        }
      }

      // Seed: koleksiyonda hiç payment yoksa Mayıs seed'lerini yükle
      if (!cancelled && !localStorage.getItem(SEED_FLAG_KEY)) {
        if (items.length === 0) {
          await upsertMany(SEED_PAYMENTS).catch(() => undefined);
        }
        localStorage.setItem(SEED_FLAG_KEY, '1');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, items.length, upsertMany]);

  const value = useMemo<DebtPaymentContextValue>(() => {
    const paymentCount = (debtName: string): number =>
      items.filter((p) => p.debtName === debtName).length;

    const paymentMonths = (debtName: string): string[] =>
      items
        .filter((p) => p.debtName === debtName)
        .map((p) => p.monthKey)
        .sort();

    const remainingInstallments = (debtName: string): number | undefined => {
      const debt = SEED_DEBTS.find((d) => d.name === debtName);
      if (!debt || debt.remainingInstallments == null) return undefined;
      return Math.max(0, debt.remainingInstallments - paymentCount(debtName));
    };

    const effectivePrincipal = (debtName: string): number | undefined => {
      const debt = SEED_DEBTS.find((d) => d.name === debtName);
      if (!debt || debt.remainingPrincipal == null) return undefined;
      return Math.max(
        0,
        debt.remainingPrincipal - paymentCount(debtName) * debt.monthlyPayment,
      );
    };

    const isClosedByPayments = (debtName: string): boolean => {
      const debt = SEED_DEBTS.find((d) => d.name === debtName);
      if (!debt) return false;
      if (debt.isPaidOff) return true;
      if (debt.type === 'interest_only') return false;
      const remaining = remainingInstallments(debtName);
      if (remaining === 0) return true;
      const principal = effectivePrincipal(debtName);
      if (principal === 0) return true;
      return false;
    };

    return {
      payments: items,
      isPaid: (debtName, monthKey) =>
        items.some((p) => p.debtName === debtName && p.monthKey === monthKey),
      markPaid: (debtName, monthKey, accountName) => {
        const payment: DebtPayment = {
          id: safeDocId(debtName, monthKey),
          debtName,
          monthKey,
          paidAt: new Date().toISOString(),
        };
        if (accountName) payment.accountName = accountName;
        void upsert(payment);
      },
      unmarkPaid: (debtName, monthKey) => {
        void remove(safeDocId(debtName, monthKey));
      },
      paymentCount,
      paymentMonths,
      remainingInstallments,
      effectivePrincipal,
      isClosedByPayments,
      monthlyPaidTotal: (monthKey) =>
        items
          .filter((p) => p.monthKey === monthKey)
          .reduce((sum, p) => {
            const debt = SEED_DEBTS.find((d) => d.name === p.debtName);
            return sum + (debt?.monthlyPayment ?? 0);
          }, 0),
      monthlyPendingTotal: (monthKey) =>
        SEED_DEBTS.filter((d) => !d.isPaidOff && !isClosedByPayments(d.name))
          .reduce((sum, debt) => {
            const paid = items.some(
              (p) => p.debtName === debt.name && p.monthKey === monthKey,
            );
            return paid ? sum : sum + debt.monthlyPayment;
          }, 0),
      balanceDelta: (accountName, sinceDate) =>
        items
          .filter(
            (p) =>
              p.accountName === accountName &&
              (sinceDate ? p.paidAt > sinceDate : true),
          )
          .reduce((sum, p) => {
            const debt = SEED_DEBTS.find((d) => d.name === p.debtName);
            return sum + (debt?.monthlyPayment ?? 0);
          }, 0),
      totalDelta: () =>
        items
          .filter((p) => p.accountName)
          .reduce((sum, p) => {
            const debt = SEED_DEBTS.find((d) => d.name === p.debtName);
            return sum + (debt?.monthlyPayment ?? 0);
          }, 0),
    };
  }, [items, upsert, remove]);

  return (
    <DebtPaymentContext.Provider value={value}>
      {children}
    </DebtPaymentContext.Provider>
  );
}

export function useDebtPayment(): DebtPaymentContextValue {
  const ctx = useContext(DebtPaymentContext);
  if (!ctx) {
    throw new Error('useDebtPayment, DebtPaymentProvider içinde kullanılmalı.');
  }
  return ctx;
}
