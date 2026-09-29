import type {
  AppSettings, Expense, ExpenseCategory, FunctionEvent, FunctionType, GiftEntry,
  GiftGiven, MoiEntry, MoiGiven, PaymentType, Person, PersonEvent, UserProfile,
} from '../../domain/models';
import type { SqlRow } from './SqlClient';

/**
 * Translation between the domain models and their rows.
 *
 * Two shapes differ deliberately and this is the only place that knows it:
 * the database is snake_case with NULL for "not set", the domain is camelCase
 * with the property absent. And `moi` / `gifts` each hold both directions,
 * so one table produces two domain types depending on `direction`.
 */

const str = (v: unknown): string => (v == null ? '' : String(v));
const opt = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  const s = String(v);
  return s === '' ? undefined : s;
};
const int = (v: unknown): number => (v == null ? 0 : Number(v));
const optInt = (v: unknown): number | undefined => (v == null ? undefined : Number(v));
const bool = (v: unknown): boolean => Number(v) === 1;

/** `undefined` becomes SQL NULL; an empty string is treated as "not set" too. */
export const nul = (v: string | undefined | null): string | null =>
  v == null || v === '' ? null : v;
export const flag = (v: boolean | undefined): number => (v ? 1 : 0);

// ---------------------------------------------------------------------------
// people
// ---------------------------------------------------------------------------

export function toPerson(r: SqlRow): Person {
  return {
    id: str(r.id),
    name: str(r.name),
    countryCode: opt(r.phone_country),
    phone: opt(r.phone),
    village: opt(r.village),
    relation: opt(r.relation),
    photoUri: opt(r.photo_path),
    notes: opt(r.notes),
    createdAt: str(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// functions
// ---------------------------------------------------------------------------

export function toFunction(r: SqlRow): FunctionEvent {
  let photos: string[] | undefined;
  try {
    const parsed = JSON.parse(str(r.photo_paths) || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) photos = parsed.map(String);
  } catch {
    // A malformed array is not worth failing a whole list load over.
    photos = undefined;
  }
  return {
    id: str(r.id),
    title: str(r.title),
    type: str(r.type) as FunctionType,
    date: str(r.date),
    time: opt(r.time),
    venue: opt(r.venue),
    village: opt(r.village),
    host: opt(r.host),
    notes: opt(r.notes),
    coverImage: opt(r.cover_path),
    photos,
    createdAt: str(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// moi — one table, two domain types
// ---------------------------------------------------------------------------

/** `direction = 'received'`: cash that came to one of our functions. */
export function toMoiEntry(r: SqlRow): MoiEntry {
  return {
    id: str(r.id),
    functionId: str(r.function_id),
    personId: str(r.person_id),
    amount: int(r.amount),
    paymentType: str(r.payment_type) as PaymentType,
    notes: opt(r.notes),
    photoUri: opt(r.photo_path),
    // The instant it was typed, which is what drives the "10:30 AM" line.
    recordedAt: str(r.created_at),
  };
}

/** `direction = 'given'`: cash we took to a function of theirs. */
export function toMoiGiven(r: SqlRow): MoiGiven {
  return {
    id: str(r.id),
    personId: str(r.person_id),
    personEventId: opt(r.person_event_id),
    occasion: opt(r.occasion),
    amount: int(r.amount),
    paymentType: str(r.payment_type) as PaymentType,
    date: str(r.entry_date),
    notes: opt(r.notes),
    photoUri: opt(r.photo_path),
    createdAt: str(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// gifts — one table, two domain types
// ---------------------------------------------------------------------------

export function toGift(r: SqlRow): GiftEntry {
  return {
    id: str(r.id),
    functionId: str(r.function_id),
    personId: str(r.person_id),
    name: str(r.name),
    // NULL means the host never priced it — not that it is worth nothing.
    value: optInt(r.value),
    notes: opt(r.notes),
    photoUri: opt(r.photo_path),
    recordedAt: str(r.created_at),
  };
}

export function toGiftGiven(r: SqlRow): GiftGiven {
  return {
    id: str(r.id),
    personId: str(r.person_id),
    personEventId: opt(r.person_event_id),
    occasion: opt(r.occasion),
    name: str(r.name),
    value: optInt(r.value),
    date: str(r.entry_date),
    notes: opt(r.notes),
    photoUri: opt(r.photo_path),
    createdAt: str(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// the rest
// ---------------------------------------------------------------------------

export function toExpense(r: SqlRow): Expense {
  return {
    id: str(r.id),
    functionId: str(r.function_id),
    category: str(r.category) as ExpenseCategory,
    amount: int(r.amount),
    paymentType: str(r.payment_type) as PaymentType,
    paidBy: opt(r.paid_by),
    date: str(r.date),
    notes: opt(r.notes),
    receiptPhoto: opt(r.receipt_path),
    createdAt: str(r.created_at),
  };
}

export function toPersonEvent(r: SqlRow): PersonEvent {
  return {
    id: str(r.id),
    personId: str(r.person_id),
    title: str(r.title),
    type: str(r.type) as FunctionType,
    date: str(r.date),
    village: opt(r.village),
    createdAt: str(r.created_at),
  };
}

export function toProfile(r: SqlRow): UserProfile {
  return {
    id: str(r.id),
    name: str(r.display_name),
    email: opt(r.email),
    village: opt(r.village),
    photoUri: opt(r.photo_url),
    // Stored split so a number can be matched across dialling codes later.
    phone: r.phone == null ? undefined : `${str(r.phone_country)}${str(r.phone)}`,
  };
}

export function toSettings(r: SqlRow): AppSettings {
  return {
    theme: str(r.theme) as AppSettings['theme'],
    language: str(r.language) as AppSettings['language'],
    suggestionRounding: int(r.suggestion_rounding),
    auspiciousRupee: bool(r.auspicious_rupee),
    hideAmountsOnHome: bool(r.hide_amounts_home),
    notifications: {
      upcomingFunction: bool(r.notify_upcoming),
      functionTomorrow: bool(r.notify_tomorrow),
      returnMoi: bool(r.notify_return_moi),
      backupReminder: bool(r.notify_backup),
    },
  };
}
