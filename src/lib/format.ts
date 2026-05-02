const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TRY_COMPACT = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const DATE_SHORT = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
});

export function formatTRY(amount: number): string {
  return TRY_FORMATTER.format(amount);
}

export function formatTRYCompact(amount: number): string {
  return TRY_COMPACT.format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return DATE_FORMATTER.format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return DATE_SHORT.format(d);
}

export function todayKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function monthKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function monthLabel(month: string): string {
  const [year, m] = month.split('-');
  const idx = Number(m) - 1;
  return `${TR_MONTHS[idx] ?? m} ${year}`;
}

export function addMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return monthKey(date);
}

export function getDaysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m, 0).getDate();
}

export function dayLabel(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const day = d.getDate();
  const monthName = TR_MONTHS[d.getMonth()] ?? '';
  const dayName = TR_DAYS[d.getDay()] ?? '';
  return `${day} ${monthName} ${dayName}`;
}

/** Verilen referans tarihten n gün önceki tarihi YYYY-MM-DD olarak döndürür. */
export function daysAgoKey(n: number, reference: Date = new Date()): string {
  const d = new Date(reference);
  d.setDate(d.getDate() - n);
  return todayKey(d);
}

