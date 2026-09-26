/**
 * Domain models for Moi Manager.
 *
 * "Moi" (மொய்) is the cash gift recorded at a Tamil family function. The app
 * tracks two directions of that flow:
 *   - moi *collected* at functions the household hosts  (`MoiEntry`)
 *   - moi the household is expected to *return* when a guest hosts their own
 *     function (`PersonEvent` + `MoiGiven`)
 *
 * All identifiers are opaque strings. All money is stored as a whole number of
 * rupees — never a float — so totals stay exact.
 */

export type ID = string;

/** ISO-8601 calendar date, `YYYY-MM-DD`. Never a timestamp. */
export type ISODate = string;

/** ISO-8601 instant, e.g. `2026-07-28T10:30:00.000Z`. */
export type ISODateTime = string;

export type FunctionType =
  | 'wedding'
  | 'ear_piercing'
  | 'house_warming'
  | 'baby_shower'
  | 'birthday'
  | 'puberty'
  | 'upanayanam'
  | 'engagement'
  | 'funeral'
  | 'other';

export type PaymentType = 'cash' | 'upi' | 'other';

export type FunctionStatus = 'upcoming' | 'completed';

export type ExpenseCategory =
  | 'food'
  | 'decoration'
  | 'hall'
  | 'travel'
  | 'photography'
  | 'invitation'
  | 'clothing'
  | 'music'
  | 'gifts'
  | 'transport'
  | 'other';

/** Family collaboration roles, most privileged first. */
export type FamilyRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Person {
  id: ID;
  name: string;
  phone?: string;
  village?: string;
  /** Owning family, when the person has been grouped into one. */
  familyId?: ID;
  /** Relationship to the household, e.g. "Mama", "Friend", "Neighbour". */
  relation?: string;
  photoUri?: string;
  notes?: string;
  createdAt: ISODateTime;
}

export interface Family {
  id: ID;
  name: string;
  village?: string;
  /** Person who represents the family. Optional for loose groupings. */
  headPersonId?: ID;
  createdAt: ISODateTime;
}

export interface FunctionEvent {
  id: ID;
  title: string;
  type: FunctionType;
  date: ISODate;
  /** Free-form start time as entered by the host, e.g. "10:00 AM". */
  time?: string;
  venue?: string;
  village?: string;
  notes?: string;
  coverImage?: string;
  /** Who is hosting, when it is not the profile owner. */
  host?: string;
  photos?: string[];
  createdAt: ISODateTime;
}

/**
 * How the moi arrived. Cash is the moi book's usual business; a gift is the
 * vessels, saree or chain that comes instead of a note.
 */
export type MoiKind = 'cash' | 'gift';

export interface MoiEntry {
  id: ID;
  functionId: ID;
  personId: ID;
  kind: MoiKind;
  /**
   * Whole rupees, and the household's collection. Always 0 on a gift: a gift's
   * worth is `giftValue`, which is deliberately kept out of every total, so
   * every sum of `amount` in the app means cash and nothing else.
   */
  amount: number;
  /** Meaningless on a gift — nobody hands over vessels by UPI. */
  paymentType: PaymentType;
  /** What the gift was, in the host's own words: "Vessels set", "Gold chain". */
  giftName?: string;
  /**
   * What the host reckons the gift is worth, if they want to say. Reported on
   * its own and never folded into moi collected, so the collection figure is
   * money that actually arrived rather than money plus an estimate.
   */
  giftValue?: number;
  notes?: string;
  photoUri?: string;
  /** When the entry was recorded — drives the "10:30 AM" line in the list. */
  recordedAt: ISODateTime;
}

/**
 * Moi the household has *given* to someone, at that person's own function.
 *
 * Deliberately a separate record from `MoiEntry` rather than a direction flag
 * on it: a `MoiEntry` must belong to one of our own functions (spec §38),
 * while a given moi belongs to somebody else's. Keeping them apart lets each
 * stay strict about its own link.
 */
export interface MoiGiven {
  id: ID;
  personId: ID;
  /** The guest's function it was given at, when that event is in the app. */
  personEventId?: ID;
  /** What it was for, when there is no `PersonEvent` — e.g. "Murugan Marriage". */
  occasion?: string;
  /** Whole rupees. */
  amount: number;
  paymentType: PaymentType;
  date: ISODate;
  notes?: string;
  photoUri?: string;
  createdAt: ISODateTime;
}

/**
 * A function hosted by *someone else* that the household has been invited to.
 * Drives the suggested return on that person's profile: when this date is
 * near, the household still owes them a moi.
 */
/**
 * A cost incurred for one function. Expenses never exist outside a function
 * (spec §38), and totals are always summed from these rows — never stored.
 */
export interface Expense {
  id: ID;
  functionId: ID;
  category: ExpenseCategory;
  /** Whole rupees. */
  amount: number;
  paymentType: PaymentType;
  /** Free text — often a relative who paid on the family's behalf. */
  paidBy?: string;
  date: ISODate;
  notes?: string;
  receiptPhoto?: string;
  createdAt: ISODateTime;
}

/** A person who can work on the household's records, with their permissions. */
export interface FamilyMember {
  id: ID;
  name: string;
  phone?: string;
  role: FamilyRole;
  /** The profile owner's own membership row cannot be removed. */
  isSelf?: boolean;
  createdAt: ISODateTime;
}

export interface PersonEvent {
  id: ID;
  personId: ID;
  title: string;
  type: FunctionType;
  date: ISODate;
  village?: string;
  createdAt: ISODateTime;
}

export interface UserProfile {
  id: ID;
  name: string;
  phone?: string;
  email?: string;
  village?: string;
  photoUri?: string;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'en' | 'ta';

/** Reminder toggles (spec §19). Kept granular so the app never spams. */
export interface NotificationSettings {
  upcomingFunction: boolean;
  functionTomorrow: boolean;
  returnMoi: boolean;
  backupReminder: boolean;
}

export interface AppSettings {
  theme: ThemePreference;
  language: LanguagePreference;
  /** Round suggested return amounts up to the nearest ₹ multiple. */
  suggestionRounding: number;
  /** Add ₹1 to suggested amounts (the traditional auspicious "odd rupee"). */
  auspiciousRupee: boolean;
  notifications: NotificationSettings;
  /** Hide amounts on the dashboard until the screen is tapped. */
  hideAmountsOnHome: boolean;
}

/**
 * A complete snapshot of the household's records.
 *
 * The app loads one of these into memory at startup (the dataset is small —
 * a heavy user has a few thousand moi entries) and every derived view in
 * `src/domain/selectors.ts` is a pure function of it. That keeps reports
 * instant and makes them trivial to unit test.
 */
export interface Dataset {
  people: Person[];
  families: Family[];
  functions: FunctionEvent[];
  moiEntries: MoiEntry[];
  moiGiven: MoiGiven[];
  expenses: Expense[];
  personEvents: PersonEvent[];
  familyMembers: FamilyMember[];
  profile: UserProfile;
  settings: AppSettings;
}

export const EMPTY_DATASET: Dataset = {
  people: [],
  families: [],
  functions: [],
  moiEntries: [],
  moiGiven: [],
  expenses: [],
  personEvents: [],
  familyMembers: [],
  profile: { id: 'me', name: '' },
  settings: {
    theme: 'system',
    language: 'en',
    suggestionRounding: 100,
    auspiciousRupee: true,
    notifications: {
      upcomingFunction: true,
      functionTomorrow: true,
      returnMoi: true,
      backupReminder: true,
    },
    hideAmountsOnHome: false,
  },
};
