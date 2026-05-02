// Tüm public veri modelleri burada toplanıyor.
// Plan: docs/PLAN.md > "Veri Modeli (TypeScript Interface'leri)"

// =============== TABAN ===============

export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export type CurrencyCode = 'TRY';

// =============== HANE / KULLANICI ===============

export interface Household extends BaseEntity {
  name: string;
  defaultDailyLimit: number;
  currency: CurrencyCode;
  memberIds: string[];
}

export type UserDisplayName = 'Emre' | 'Sıla';

export interface User extends BaseEntity {
  householdId: string;
  displayName: UserDisplayName;
  email?: string;
  color: string;
}

// =============== HESAPLAR (KASA) ===============

export type AccountType = 'bank' | 'cash' | 'savings' | 'virtual_kasa';
export type AccountOwner = 'emre' | 'sila' | 'shared';

export interface Account extends BaseEntity {
  householdId: string;
  name: string;
  type: AccountType;
  owner: AccountOwner;
  balance: number;
  bankName?: string;
  isActive: boolean;
}

// =============== GELİRLER ===============

export type IncomeFrequency = 'monthly' | 'one_time' | 'seasonal_range';
export type IncomeCategory = 'salary' | 'side_income' | 'bonus' | 'other';

export interface SeasonalRange {
  startMonth: string; // "YYYY-MM"
  endMonth: string;
}

export interface OneTimeOccurrence {
  expectedDate?: string; // YYYY-MM-DD
  amount: number;
  received: boolean;
  actualReceivedDate?: string;
  note?: string;
}

export interface Income extends BaseEntity {
  householdId: string;
  ownerId: string;
  name: string;
  category: IncomeCategory;
  frequency: IncomeFrequency;

  amountFixed?: number;
  amountMin?: number;
  amountMax?: number;

  dayOfMonth?: number;
  activeMonths?: SeasonalRange[];
  oneTimeOccurrences?: OneTimeOccurrence[];

  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
}

// =============== BORÇLAR ===============

export type DebtType =
  | 'fixed_installment'
  | 'remaining_balance'
  | 'interest_only'
  | 'personal_loan';

export interface Debt extends BaseEntity {
  householdId: string;
  ownerId: string;
  name: string;
  type: DebtType;
  bankOrCreditor: string;

  monthlyPayment: number;
  paymentDayOfMonth: number;

  totalInstallments?: number;
  remainingInstallments?: number;

  remainingPrincipal?: number;

  principalAmount?: number;
  monthlyInterest?: number;
  interestRate?: number; // % aylık (örn 4.25)

  startDate: string;
  expectedEndDate?: string;
  isPaidOff: boolean;
  notes?: string;
}

// =============== DÜZENLİ SABİT GİDERLER ===============

export type RecurringExpenseCategory =
  | 'electricity'
  | 'water'
  | 'gas'
  | 'phone'
  | 'internet'
  | 'subscription'
  | 'other';

export interface RecurringFixedExpense extends BaseEntity {
  householdId: string;
  name: string;
  category: RecurringExpenseCategory;
  amount: number;
  paymentDayOfMonth: number;
  ownerId?: string;
  isActive: boolean;
  notes?: string;
}

// =============== GİDERLER (Günlük) ===============

export type ExpenseCategory =
  | 'food'
  | 'grocery'
  | 'fuel'
  | 'transport'
  | 'health'
  | 'clothing'
  | 'entertainment'
  | 'cigarette'
  | 'bill'
  | 'other';

export interface Expense extends BaseEntity {
  householdId: string;
  spenderId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  description?: string;
  fromAccountId?: string;
}

// =============== GÜNLÜK LİMİT ===============

export type DailyLimitStatus = 'open' | 'closed';

export interface DailyLimit extends BaseEntity {
  householdId: string;
  date: string; // YYYY-MM-DD
  baseLimit: number;
  carryOverFromYesterday: number;
  effectiveLimit: number;
  totalSpent: number;
  difference: number;
  status: DailyLimitStatus;
  closedAt?: string;
}

// =============== KASA İŞLEMLERİ ===============

export type KasaTransactionReason =
  | 'daily_savings'
  | 'manual_deposit'
  | 'manual_withdrawal'
  | 'transfer_to_account';

export interface KasaTransaction extends BaseEntity {
  householdId: string;
  date: string;
  amount: number;
  reason: KasaTransactionReason;
  relatedDailyLimitId?: string;
  relatedAccountId?: string;
  description?: string;
  runningBalance: number;
}

// =============== AYARLAR ===============

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings extends BaseEntity {
  householdId: string;
  defaultDailyLimit: number;
  defaultCurrency: CurrencyCode;
  weekStartsOn: 0 | 1; // 0 = Pazar, 1 = Pazartesi
  notificationEnabled: boolean;
  theme: ThemePreference;
  language: 'tr';
}
