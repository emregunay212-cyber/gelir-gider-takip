import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { DocumentData } from 'firebase/firestore';
import { SEED_RECURRING_EXPENSES } from '../../db/seed';
import {
  safeDocId,
  useFirestoreDocument,
} from '../../lib/firestore-helpers';
import { useBillPayment } from './BillPaymentProvider';

/**
 * BillsProvider artık sadece `amounts` (fatura tutarları) tutar.
 * "Ödendi mi?" sorgusu artık `BillPaymentProvider`'a delege edilir.
 *
 * Eski `state.paidByMonth` (string array) field'ı Firestore'da BillPayment
 * record'larına migrate edilir — `bill_payments_migrated_v1` flag'iyle bir kez.
 */

interface BillsState {
  amounts: Record<string, number>;
  /** @deprecated v2'de kaldırıldı — sadece migration için kullanılır */
  paidByMonth?: Record<string, string[]>;
}

interface BillsContextValue {
  amounts: Record<string, number>;
  getAmount: (name: string) => number;
  setAmount: (name: string, amount: number) => void;
  /** Tüm fatura kalemlerinin aylık toplam projeksiyonu (ödenmiş + bekleyen) */
  monthlyTotal: () => number;
  /** Bu ay ödenmiş faturalar toplamı (BillPaymentProvider'a delege) */
  monthlyPaidTotal: (monthKey: string) => number;
  /** Bu ay ödenmeyen faturalar toplamı (BillPaymentProvider'a delege) */
  monthlyPendingTotal: (monthKey: string) => number;
  /** @deprecated useBillPayment.isPaid kullan */
  isPaid: (name: string, monthKey: string) => boolean;
}

const BillsContext = createContext<BillsContextValue | null>(null);
const COLLECTION = 'state';
const DOC_ID = 'bills';
const LEGACY_MIGRATION_KEY = 'bills_state_migrated_v1';
const PAYMENT_MIGRATION_KEY = 'bill_payments_migrated_v1';
const LEGACY_STORAGE_KEY = 'bills_state_v1';
const DEFAULT_STATE: BillsState = { amounts: {} };

function validateBillsState(raw: DocumentData): BillsState | null {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof raw.amounts !== 'object'
  ) {
    return null;
  }
  const amounts: Record<string, number> = {};
  Object.entries(raw.amounts as Record<string, unknown>).forEach(([k, v]) => {
    if (typeof v === 'number') amounts[k] = v;
  });
  const state: BillsState = { amounts };

  // Migration için eski paidByMonth okunur ama context'e dahil edilmez
  if (typeof raw.paidByMonth === 'object' && raw.paidByMonth !== null) {
    const paidByMonth: Record<string, string[]> = {};
    Object.entries(raw.paidByMonth as Record<string, unknown>).forEach(
      ([k, v]) => {
        if (Array.isArray(v)) {
          paidByMonth[k] = v.filter((x): x is string => typeof x === 'string');
        }
      },
    );
    if (Object.keys(paidByMonth).length > 0) {
      state.paidByMonth = paidByMonth;
    }
  }
  return state;
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
  const { markPaid, isPaid, monthlyPaidTotal, monthlyPendingTotal } =
    useBillPayment();

  const state = data ?? DEFAULT_STATE;

  // Migration 1: localStorage'da eski bills_state_v1 varsa Firestore'a taşı
  useEffect(() => {
    if (!ready) return;
    if (localStorage.getItem(LEGACY_MIGRATION_KEY)) return;
    void (async () => {
      try {
        const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          const validated = validateBillsState(parsed as DocumentData);
          if (validated) {
            const merged: BillsState = {
              amounts: { ...validated.amounts, ...state.amounts },
            };
            if (validated.paidByMonth) merged.paidByMonth = validated.paidByMonth;
            await save(merged);
          }
        }
        localStorage.setItem(LEGACY_MIGRATION_KEY, '1');
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // sessizce geç
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Migration 2: state.paidByMonth → BillPayment Firestore koleksiyonu
  useEffect(() => {
    if (!ready) return;
    if (localStorage.getItem(PAYMENT_MIGRATION_KEY)) return;
    if (!state.paidByMonth || Object.keys(state.paidByMonth).length === 0) {
      // Eski veri yok — yine de flag bas ki tekrar çalışmasın
      localStorage.setItem(PAYMENT_MIGRATION_KEY, '1');
      return;
    }
    void (async () => {
      try {
        for (const [monthKey, billNames] of Object.entries(state.paidByMonth!)) {
          for (const billName of billNames) {
            const seedBill = SEED_RECURRING_EXPENSES.find(
              (b) => b.name === billName,
            );
            const amount =
              state.amounts[billName] ?? seedBill?.amount ?? 0;
            // markPaid id'yi safeDocId(name, month) yapar — duplicate olmaz
            markPaid(billName, monthKey, amount);
          }
        }
        // state.paidByMonth'u temizle
        const cleaned: BillsState = { amounts: state.amounts };
        await save(cleaned);
        localStorage.setItem(PAYMENT_MIGRATION_KEY, '1');
      } catch {
        // sessizce geç
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state]);

  // Unused warning'i suppress et — safeDocId migration'a referans var
  void safeDocId;

  const value = useMemo<BillsContextValue>(() => {
    const getAmount = (name: string): number => {
      if (name in state.amounts) return state.amounts[name];
      const seed = SEED_RECURRING_EXPENSES.find((b) => b.name === name);
      return seed?.amount ?? 0;
    };

    const allBillNames = SEED_RECURRING_EXPENSES.map((b) => b.name);

    return {
      amounts: state.amounts,
      getAmount,
      setAmount: (name, amount) => {
        const next: BillsState = {
          amounts: { ...state.amounts, [name]: amount },
        };
        void save(next);
      },
      monthlyTotal: () =>
        SEED_RECURRING_EXPENSES.reduce(
          (sum, bill) => sum + getAmount(bill.name),
          0,
        ),
      monthlyPaidTotal,
      monthlyPendingTotal: (monthKey) =>
        monthlyPendingTotal(monthKey, allBillNames, getAmount),
      isPaid,
    };
  }, [state, save, isPaid, monthlyPaidTotal, monthlyPendingTotal]);

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
