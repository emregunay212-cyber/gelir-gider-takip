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

/**
 * Fatura ödeme kayıtları — borç ödemeleri gibi Firestore'da koleksiyon.
 * `BillsProvider` artık sadece `amounts` tutar; ödendi/ödenmedi durumu burada.
 *
 * `amount` snapshot olarak saklanır: kullanıcı sonradan fatura tutarını
 * değiştirse bile geçmiş ödemenin tutarı değişmez (audit trail).
 */

export interface BillPayment {
  id: string;           // safeDocId(billName, monthKey)
  billName: string;
  monthKey: string;     // YYYY-MM
  amount: number;       // O ay için ödenen tutar (snapshot)
  paidAt: string;       // ISO timestamp
  accountName?: string; // PayBillDialog'da seçilen hesap
}

interface BillPaymentContextValue {
  payments: readonly BillPayment[];
  isPaid: (billName: string, monthKey: string) => boolean;
  getPayment: (billName: string, monthKey: string) => BillPayment | undefined;
  markPaid: (
    billName: string,
    monthKey: string,
    amount: number,
    accountName?: string,
  ) => void;
  unmarkPaid: (billName: string, monthKey: string) => void;
  monthlyPaidTotal: (monthKey: string) => number;
  /** Pending hesabı için BillsProvider.getAmount kullanılarak ödenmeyen toplam */
  monthlyPendingTotal: (
    monthKey: string,
    allBillNames: readonly string[],
    getAmount: (name: string) => number,
  ) => number;
  /**
   * @param sinceDate - ISO timestamp. Verilirse o tarihten SONRA (strict >)
   * yapılan ödemeleri sayar. Override mantığı için kullanılır.
   */
  balanceDelta: (accountName: string, sinceDate?: string) => number;
  totalDelta: () => number;
}

const BillPaymentContext = createContext<BillPaymentContextValue | null>(null);
const COLLECTION = 'billPayments';

function validateBillPayment(raw: DocumentData): BillPayment | null {
  if (
    typeof raw.id !== 'string' ||
    typeof raw.billName !== 'string' ||
    typeof raw.monthKey !== 'string' ||
    typeof raw.amount !== 'number' ||
    typeof raw.paidAt !== 'string'
  ) {
    return null;
  }
  const payment: BillPayment = {
    id: raw.id,
    billName: raw.billName,
    monthKey: raw.monthKey,
    amount: raw.amount,
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

export function BillPaymentProvider({ children }: ProviderProps) {
  const { items, ready, upsert, remove } =
    useFirestoreCollection<BillPayment>(COLLECTION, validateBillPayment);

  // Migration: BillsProvider'daki eski state.paidByMonth verisini buraya taşı.
  // BillsProvider tarafında flag konacak (`bill_payments_migrated_v1`); burada
  // sadece Firestore koleksiyonu sağlanır.
  useEffect(() => {
    if (!ready) return;
    // Migration BillsProvider tarafında yapılıyor — burada no-op.
  }, [ready]);

  const value = useMemo<BillPaymentContextValue>(
    () => ({
      payments: items,
      isPaid: (billName, monthKey) =>
        items.some(
          (p) => p.billName === billName && p.monthKey === monthKey,
        ),
      getPayment: (billName, monthKey) =>
        items.find(
          (p) => p.billName === billName && p.monthKey === monthKey,
        ),
      markPaid: (billName, monthKey, amount, accountName) => {
        const payment: BillPayment = {
          id: safeDocId(billName, monthKey),
          billName,
          monthKey,
          amount,
          paidAt: new Date().toISOString(),
        };
        if (accountName) payment.accountName = accountName;
        void upsert(payment);
      },
      unmarkPaid: (billName, monthKey) => {
        void remove(safeDocId(billName, monthKey));
      },
      monthlyPaidTotal: (monthKey) =>
        items
          .filter((p) => p.monthKey === monthKey)
          .reduce((sum, p) => sum + p.amount, 0),
      monthlyPendingTotal: (monthKey, allBillNames, getAmount) =>
        allBillNames.reduce((sum, name) => {
          const paid = items.some(
            (p) => p.billName === name && p.monthKey === monthKey,
          );
          return paid ? sum : sum + getAmount(name);
        }, 0),
      balanceDelta: (accountName, sinceDate) =>
        items
          .filter(
            (p) =>
              p.accountName === accountName &&
              (sinceDate ? p.paidAt > sinceDate : true),
          )
          .reduce((sum, p) => sum + p.amount, 0),
      totalDelta: () =>
        items
          .filter((p) => p.accountName)
          .reduce((sum, p) => sum + p.amount, 0),
    }),
    [items, upsert, remove],
  );

  return (
    <BillPaymentContext.Provider value={value}>
      {children}
    </BillPaymentContext.Provider>
  );
}

export function useBillPayment(): BillPaymentContextValue {
  const ctx = useContext(BillPaymentContext);
  if (!ctx) {
    throw new Error(
      'useBillPayment, BillPaymentProvider içinde kullanılmalı.',
    );
  }
  return ctx;
}
