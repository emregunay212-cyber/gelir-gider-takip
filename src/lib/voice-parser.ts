import type { ExpenseCategory } from '@/types';
import type { ExpenseSpender } from '@/features/expense/ExpenseProvider';
import { SEED_ACCOUNTS } from '@/db/seed';

export interface ParsedExpense {
  amount: number;
  category: ExpenseCategory;
  accountName?: string;
  spender?: ExpenseSpender;
  description: string;
  rawText: string;
}

/**
 * Türkçe-uyumlu küçük harf dönüşümü.
 * "İ"yi noktalı i yerine düz "i"ye çevirir.
 */
function trLower(input: string): string {
  return input.toLocaleLowerCase('tr-TR').replace(/i̇/g, 'i');
}

const CATEGORY_KEYWORDS: Record<ExpenseCategory, readonly string[]> = {
  cigarette: ['sigara', 'tütün', 'maltepe', 'parliament', 'marlboro', 'winston'],
  food: [
    'yemek',
    'restoran',
    'lokanta',
    'kebap',
    'pide',
    'lahmacun',
    'pizza',
    'burger',
    'döner',
    'çorba',
    'kahvaltı',
    'mcdonald',
    'kfc',
    'burger king',
    'starbucks',
    'kahve',
    'çay bahçesi',
  ],
  grocery: [
    'market',
    'bakkal',
    'migros',
    'bim',
    'a101',
    'şok',
    'carrefour',
    'metro',
    'macrocenter',
    'alışveriş',
    'manav',
    'kasap',
  ],
  fuel: ['yakıt', 'benzin', 'mazot', 'lpg', 'shell', 'opet', 'bp', 'petrol ofisi', 'po'],
  transport: [
    'taksi',
    'dolmuş',
    'otobüs',
    'metro',
    'metrobüs',
    'tramvay',
    'ulaşım',
    'uber',
    'bitaksi',
    'bilet',
  ],
  health: [
    'ilaç',
    'eczane',
    'sağlık',
    'doktor',
    'hastane',
    'muayene',
    'tahlil',
    'medikal',
  ],
  clothing: [
    'giyim',
    'kıyafet',
    'pantolon',
    'gömlek',
    'tişört',
    'ayakkabı',
    'koton',
    'lc waikiki',
    'defacto',
    'zara',
    'h&m',
  ],
  entertainment: [
    'sinema',
    'eğlence',
    'konser',
    'tiyatro',
    'oyun',
    'netflix',
    'spotify',
    'bowling',
    'park',
    'gezi',
  ],
  bill: ['fatura', 'elektrik', 'su', 'doğalgaz', 'internet', 'telefon faturası'],
  other: [],
};

function parseAmount(text: string): number {
  const lower = trLower(text);

  // 105 tl, 105 lira, 105.50 tl, 105,50 tl
  const tlMatch = lower.match(
    /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:tl|tıl|lira|liraya|liralık|tilik)/,
  );
  if (tlMatch) {
    return normalizeNumber(tlMatch[1]);
  }

  // Sadece rakam (TL'siz): "105 sigara aldım" gibi
  const numMatch = lower.match(/(?:^|\s)(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s|$)/);
  if (numMatch) {
    return normalizeNumber(numMatch[1]);
  }

  return 0;
}

function normalizeNumber(raw: string): number {
  // "1.500,50" → 1500.50
  // "1,500.50" → 1500.50
  // "105,50" → 105.50
  // "105.50" → 105.50
  let cleaned = raw.trim();
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      // Türkçe format: nokta=binlik, virgül=ondalık
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // İngilizce format: virgül=binlik, nokta=ondalık
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    // Sadece virgül → ondalık
    cleaned = cleaned.replace(',', '.');
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseCategory(text: string): ExpenseCategory {
  const lower = trLower(text);
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [ExpenseCategory, readonly string[]]
  >) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return 'other';
}

function parseSpender(text: string): ExpenseSpender | undefined {
  const lower = trLower(text);
  if (/\bsıla\b/.test(lower) || /\bsila\b/.test(lower)) return 'sila';
  if (/\bemre\b/.test(lower)) return 'emre';
  if (/\beşim\b/.test(lower) || /\bkar[ıi]m\b/.test(lower)) return 'sila';
  return undefined;
}

function parseAccount(text: string): string | undefined {
  const lower = trLower(text);

  // Tüm SEED_ACCOUNTS isimlerini sırayla kontrol et
  for (const account of SEED_ACCOUNTS) {
    if (lower.includes(trLower(account.name))) return account.name;
  }

  // Banka adı kısaltmaları + sahip ipucu
  const hasSila = /\bs[ıi]la\b/.test(lower);
  const hasEmre = /\bemre\b/.test(lower);

  if (lower.includes('garanti')) {
    if (hasSila) return 'Sıla Garanti';
    return 'Emre Garanti';
  }
  if (lower.includes('akbank')) return 'Emre Akbank';
  if (lower.includes('getir')) return 'Emre Getir';
  if (lower.includes('denizbank') || lower.includes('deniz bank')) {
    return 'Sıla Denizbank';
  }
  if (lower.includes('nakit') || lower.includes('cep')) return 'Evdeki Nakit';

  // Sahip belli ama banka yok → sahibinin Garanti'si
  if (hasSila) return 'Sıla Garanti';
  if (hasEmre) return 'Emre Garanti';

  return undefined;
}

export function parseExpenseFromSpeech(rawText: string): ParsedExpense {
  return {
    amount: parseAmount(rawText),
    category: parseCategory(rawText),
    accountName: parseAccount(rawText),
    spender: parseSpender(rawText),
    description: rawText.trim(),
    rawText,
  };
}
