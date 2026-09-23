/**
 * Indian-numbering money formatting (lakh / crore grouping), e.g.
 * 845500 → "8,45,500".
 */
export function formatIndianNumber(value: number): string {
  const negative = value < 0;
  const digits = Math.abs(Math.round(value)).toString();
  if (digits.length <= 3) return (negative ? '-' : '') + digits;

  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped},${last3}`;
}

/** e.g. `₹8,45,500`, and `-₹2,05,512` when negative — sign before the symbol. */
export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}₹${formatIndianNumber(Math.abs(rounded))}`;
}

/**
 * Compact money for tight stat tiles, e.g. `₹8.46L`, `₹1.2Cr`.
 * Falls back to the full value below one lakh so small numbers stay exact.
 */
export function formatMoneyCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2)}L`;
  return formatMoney(value);
}

/** `486` → `486`, `1240` → `1.2K` — used on count tiles. */
export function formatCount(value: number): string {
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** Up to two initials for avatar fallbacks. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** `98765 43210` for Indian ten-digit numbers; returned unchanged otherwise. */
export function formatPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

/** Stable index into a fixed palette, so a person always gets the same colour. */
export function hashToIndex(key: string, buckets: number): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % buckets;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

/** Spells a number under 100. */
function underHundred(n: number): string {
  if (n < 20) return ONES[n];
  const tens = TENS[Math.floor(n / 10)];
  const ones = ONES[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

/** Spells a number under 1000, joining with "and" the way a cheque reads. */
function underThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (!hundreds) return underHundred(rest);
  if (!rest) return `${ONES[hundreds]} Hundred`;
  return `${ONES[hundreds]} Hundred and ${underHundred(rest)}`;
}

/**
 * Amount in words using the Indian system — crore, lakh, thousand — as printed
 * on a receipt: "One Thousand and One Rupees Only".
 */
export function amountInWords(value: number): string {
  const amount = Math.abs(Math.round(value));
  if (amount === 0) return 'Zero Rupees Only';

  const crore = Math.floor(amount / 10_000_000);
  const lakh = Math.floor((amount % 10_000_000) / 100_000);
  const thousand = Math.floor((amount % 100_000) / 1000);
  const rest = amount % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (rest) {
    // "and" reads naturally before a final part under 100, as on a cheque.
    // "and" only when it is not already inside `underThousand`.
    parts.push(parts.length > 0 && rest < 100 ? `and ${underHundred(rest)}` : underThousand(rest));
  }

  const sign = value < 0 ? 'Minus ' : '';
  return `${sign}${parts.join(' ')} Rupees Only`;
}
