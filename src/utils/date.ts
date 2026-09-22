import type { ISODate } from '../domain/models';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** `YYYY-MM-DD` in *local* time — never `toISOString`, which shifts the day. */
export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses `YYYY-MM-DD` as a local-midnight Date. */
export function fromISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** e.g. `28 Jul 2026` */
export function formatDate(iso: ISODate): string {
  const d = fromISODate(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. `28 July 2026` */
export function formatDateLong(iso: ISODate): string {
  const d = fromISODate(iso);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/** e.g. `Jul 2026` */
export function formatMonth(iso: ISODate): string {
  const d = fromISODate(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Clock time from an instant, e.g. `10:30 AM`. */
export function formatTime(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
}

/** Whole days from today to `iso`. Negative when the date has passed. */
export function daysUntil(iso: ISODate, from = new Date()): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(fromISODate(iso)).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Human countdown used on upcoming-function badges. */
export function countdownLabel(iso: ISODate, from = new Date()): string {
  const days = daysUntil(iso, from);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `${days} Days Left`;
  return `${Math.abs(days)} Days Ago`;
}

/** Greeting for the home header, based on the device clock. */
export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function isUpcoming(iso: ISODate, from = new Date()): boolean {
  return daysUntil(iso, from) >= 0;
}
