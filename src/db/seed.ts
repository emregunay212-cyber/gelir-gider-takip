// Mevcut finansal durumun seed datası.
// Faz 3'te Firestore'a yüklenecek (ilk açılışta veya Ayarlar > Verileri Sıfırla).

import type {
  AccountOwner,
  AccountType,
  DebtType,
  IncomeCategory,
  IncomeFrequency,
  RecurringExpenseCategory,
  UserDisplayName,
} from '../types';

export interface SeedAccount {
  name: string;
  type: AccountType;
  owner: AccountOwner;
  balance: number;
  bankName?: string;
}

export interface SeedDebt {
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
}

export interface SeedIncome {
  name: string;
  ownerKey: 'emre' | 'sila';
  category: IncomeCategory;
  frequency: IncomeFrequency;
  amountFixed?: number;
  amountMin?: number;
  amountMax?: number;
  dayOfMonth?: number;
  activeMonths?: ReadonlyArray<{ startMonth: string; endMonth: string }>;
  oneTimeOccurrences?: ReadonlyArray<{
    amount: number;
    expectedDate?: string;
    note?: string;
  }>;
  notes?: string;
}

export interface SeedRecurringExpense {
  name: string;
  category: RecurringExpenseCategory;
  amount: number;
  paymentDayOfMonth: number;
  ownerKey?: 'emre' | 'sila';
  notes?: string;
}

export interface SeedUser {
  displayName: UserDisplayName;
  color: string;
}

export const SEED_HOUSEHOLD = {
  name: 'Emre & Sıla',
  defaultDailyLimit: 510, // 300 yaşam + 210 sigara dahil
} as const;

export const SEED_USERS: readonly SeedUser[] = [
  { displayName: 'Emre', color: '#3b82f6' },
  { displayName: 'Sıla', color: '#ec4899' },
];

export const SEED_ACCOUNTS: readonly SeedAccount[] = [
  { name: 'Emre Garanti', type: 'bank', owner: 'emre', balance: 21544.25, bankName: 'Garanti BBVA' },
  { name: 'Emre Getir', type: 'bank', owner: 'emre', balance: 505.38, bankName: 'Getir Finans' },
  { name: 'Emre Akbank', type: 'bank', owner: 'emre', balance: 1200.0, bankName: 'Akbank' },
  { name: 'Sıla Denizbank', type: 'bank', owner: 'sila', balance: 5857.64, bankName: 'DenizBank' },
  { name: 'Sıla Garanti', type: 'bank', owner: 'sila', balance: 814.45, bankName: 'Garanti BBVA' },
  { name: 'Evdeki Nakit', type: 'cash', owner: 'shared', balance: 7900.0 },
];

// Seed remainingInstallments orijinal değerler — toplam ay sayısı.
// Mayıs 2026 ödemesi DebtPaymentProvider seed'inde "ödendi" olarak işaretli (Mehmet hariç).
// Kullanıcı sonraki ayları "Bu Ay Ödendi" butonu ile işaretler, kalan ay otomatik düşer.
export const SEED_DEBTS: readonly SeedDebt[] = [
  {
    name: 'İş Bankası — Emre',
    ownerKey: 'emre',
    type: 'remaining_balance',
    bankOrCreditor: 'İş Bankası',
    monthlyPayment: 6800,
    remainingPrincipal: 140358,
    notes: 'Faiz dahil kalan toplam borç (Mayıs öncesi). ~21 ay.',
  },
  {
    name: 'Evkur',
    ownerKey: 'emre',
    type: 'fixed_installment',
    bankOrCreditor: 'Evkur',
    monthlyPayment: 5440,
    totalInstallments: 20,
    remainingInstallments: 20,
  },
  {
    name: 'Melih Kredi',
    ownerKey: 'emre',
    type: 'fixed_installment',
    bankOrCreditor: 'Melih',
    monthlyPayment: 5650,
    totalInstallments: 27,
    remainingInstallments: 27,
  },
  {
    name: 'Emre Garanti 1',
    ownerKey: 'emre',
    type: 'fixed_installment',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 2741,
    totalInstallments: 16,
    remainingInstallments: 16,
  },
  {
    name: 'Emre Garanti 2',
    ownerKey: 'emre',
    type: 'fixed_installment',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 1777.08,
    totalInstallments: 28,
    remainingInstallments: 28,
  },
  {
    name: 'Emre Garanti 3',
    ownerKey: 'emre',
    type: 'fixed_installment',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 1153.23,
    totalInstallments: 15,
    remainingInstallments: 15,
  },
  {
    name: 'Emre Garanti 4',
    ownerKey: 'emre',
    type: 'fixed_installment',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 1147.82,
    totalInstallments: 16,
    remainingInstallments: 16,
  },
  {
    name: 'Emre Garanti 5',
    ownerKey: 'emre',
    type: 'fixed_installment',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 611.52,
    totalInstallments: 17,
    remainingInstallments: 17,
  },
  {
    name: 'Mehmet Enişte Borç',
    ownerKey: 'emre',
    type: 'personal_loan',
    bankOrCreditor: 'Mehmet Enişte',
    monthlyPayment: 5300,
    totalInstallments: 1,
    remainingInstallments: 1,
    notes: 'Son ödeme Haziran 2026 — borç o ay kapanacak.',
  },
  {
    name: 'Sıla Garanti 1',
    ownerKey: 'sila',
    type: 'fixed_installment',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 3994.58,
    totalInstallments: 38,
    remainingInstallments: 38,
  },
  {
    name: 'Sıla Garanti 2',
    ownerKey: 'sila',
    type: 'fixed_installment',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 1760.83,
    totalInstallments: 38,
    remainingInstallments: 38,
  },
  {
    name: 'Sıla QNB Kredi Kartı',
    ownerKey: 'sila',
    type: 'fixed_installment',
    bankOrCreditor: 'QNB',
    monthlyPayment: 1693.93,
    totalInstallments: 4,
    remainingInstallments: 4,
  },
  {
    name: 'Sıla Garanti Nakit Avans',
    ownerKey: 'sila',
    type: 'interest_only',
    bankOrCreditor: 'Garanti BBVA',
    monthlyPayment: 3171.04,
    principalAmount: 74612.63,
    monthlyInterest: 3171.04,
    interestRate: 4.25,
    notes:
      'Sadece faiz ödeniyor — ana borç (74.612,63 TL) sabit kalır. Aylık faiz oranı %4,25.',
  },
];

export const SEED_INCOMES: readonly SeedIncome[] = [
  {
    name: 'Emre Maaş',
    ownerKey: 'emre',
    category: 'salary',
    frequency: 'monthly',
    amountFixed: 43000,
    dayOfMonth: 1,
    notes: "Ağustos 2026'da zam olacak — bilgi geldiğinde Gelirler sayfasından güncelle.",
  },
  {
    name: 'Sıla Maaş',
    ownerKey: 'sila',
    category: 'salary',
    frequency: 'monthly',
    amountMin: 25000,
    amountMax: 28000,
    dayOfMonth: 5,
    notes: 'İzin durumuna göre değişken (asgari ücret tabanında).',
  },
  {
    name: 'Emre Kurs Ücreti',
    ownerKey: 'emre',
    category: 'side_income',
    frequency: 'seasonal_range',
    amountMin: 5500,
    amountMax: 6000,
    activeMonths: [
      { startMonth: '2026-05', endMonth: '2026-06' },
      { startMonth: '2026-11', endMonth: '2027-01' },
      { startMonth: '2027-03', endMonth: '2027-05' },
    ],
    notes: "Okul sezonu içinde 3'er aylık dönemler. Mevcut + 2 dönem daha kalmış.",
  },
  {
    name: 'Emre Maç Ücreti',
    ownerKey: 'emre',
    category: 'side_income',
    frequency: 'one_time',
    oneTimeOccurrences: [
      { amount: 1000, note: 'Maç 1' },
      { amount: 1000, note: 'Maç 2' },
      { amount: 1000, note: 'Maç 3' },
      { amount: 1000, note: 'Maç 4' },
      { amount: 1000, note: 'Maç 5' },
    ],
    notes: 'Maç başı 1.000 TL — geldikçe "alındı" işaretle.',
  },
  {
    name: 'Sodexo Market',
    ownerKey: 'sila',
    category: 'bonus',
    frequency: 'monthly',
    amountMin: 3500,
    amountMax: 4000,
    dayOfMonth: 5,
    notes:
      'Market alışverişi için Sodexo kartı — tutar her ay 3500-4000 TL arası değişiyor.',
  },
];

export const SEED_RECURRING_EXPENSES: readonly SeedRecurringExpense[] = [
  { name: 'Elektrik', category: 'electricity', amount: 0, paymentDayOfMonth: 15, notes: 'Tutar girilecek (Ayarlar > Faturalar).' },
  { name: 'Su', category: 'water', amount: 0, paymentDayOfMonth: 15, notes: 'Tutar girilecek.' },
  { name: 'Doğalgaz', category: 'gas', amount: 0, paymentDayOfMonth: 15, notes: 'Tutar girilecek.' },
  { name: 'Sıla Telefon', category: 'phone', amount: 0, paymentDayOfMonth: 5, ownerKey: 'sila' },
  { name: 'Emre Telefon', category: 'phone', amount: 0, paymentDayOfMonth: 5, ownerKey: 'emre' },
  { name: 'Ev İnternet', category: 'internet', amount: 0, paymentDayOfMonth: 10 },
];
