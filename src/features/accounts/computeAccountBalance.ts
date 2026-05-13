import type { AccountOverride } from './AccountOverridesProvider';

/**
 * Hesap için "şu anki gerçek bakiye" hesaplaması.
 *
 * **Override yok** ise: `seed.balance + tüm delta'lar`
 * **Override var** ise: `override.amount + override.setAt sonrası delta'lar`
 *
 * Hem `Dashboard.tsx` (totalCash) hem `Hesaplar.tsx` (per-account effective)
 * bu helper'ı kullanır → tek formül, tutarsızlık imkânsız.
 *
 * Delta fonksiyonları sinceDate opsiyonel parametresini desteklemeli:
 * - SalaryProvider.balanceDelta(name, since?)
 * - CashProvider.balanceDelta(name, since?)
 * - ExpenseProvider.balanceDelta(name, since?)
 * - DebtPaymentProvider.balanceDelta(name, since?)
 * - BillPaymentProvider.balanceDelta(name, since?)
 *
 * `sinceDate` verilmezse tüm delta'lar; verilirse `createdAt > sinceDate` strict
 * greater olanlar sayılır.
 */

export interface AccountLike {
  name: string;
  balance: number;
}

export interface DeltaFunctions {
  salary: (accountName: string, sinceDate?: string) => number;
  cash: (accountName: string, sinceDate?: string) => number;
  expense: (accountName: string, sinceDate?: string) => number;
  debt: (accountName: string, sinceDate?: string) => number;
  bills: (accountName: string, sinceDate?: string) => number;
}

export interface AccountBalanceBreakdown {
  baseBalance: number;
  salaryDelta: number;
  cashDelta: number;
  expenseDelta: number;
  debtDelta: number;
  billsDelta: number;
  effectiveBalance: number;
  hasOverride: boolean;
  /** Override.setAt — yoksa undefined */
  sinceDate: string | undefined;
}

/**
 * Tek hesap için tam breakdown döner. UI tarafında delta gösterimleri için kullanışlı.
 */
export function computeAccountBreakdown(
  account: AccountLike,
  override: AccountOverride | undefined,
  deltas: DeltaFunctions,
): AccountBalanceBreakdown {
  const sinceDate = override?.setAt;
  const baseBalance = override ? override.amount : account.balance;
  const salaryDelta = deltas.salary(account.name, sinceDate);
  const cashDelta = deltas.cash(account.name, sinceDate);
  const expenseDelta = deltas.expense(account.name, sinceDate);
  const debtDelta = deltas.debt(account.name, sinceDate);
  const billsDelta = deltas.bills(account.name, sinceDate);
  const effectiveBalance =
    baseBalance + salaryDelta + cashDelta - expenseDelta - debtDelta - billsDelta;
  return {
    baseBalance,
    salaryDelta,
    cashDelta,
    expenseDelta,
    debtDelta,
    billsDelta,
    effectiveBalance,
    hasOverride: !!override,
    sinceDate,
  };
}

/**
 * Sadece effective balance lazımsa kısa hali.
 */
export function computeAccountEffectiveBalance(
  account: AccountLike,
  override: AccountOverride | undefined,
  deltas: DeltaFunctions,
): number {
  return computeAccountBreakdown(account, override, deltas).effectiveBalance;
}
