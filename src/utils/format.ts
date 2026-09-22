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
