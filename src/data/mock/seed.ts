import type {
  AppSettings,
  Expense,
  ExpenseCategory,
  Family,
  FamilyMember,
  FunctionEvent,
  FunctionType,
  MoiEntry,
  MoiGiven,
  PaymentType,
  Person,
  PersonEvent,
  UserProfile,
} from '../../domain/models';
import type { BackupPayload } from '../DataSource';
import { addDays, fromISODate, toISODate } from '../../utils/date';

/**
 * Deterministic demo data.
 *
 * Dates are generated relative to "today" so the demo always has genuinely
 * upcoming functions and meaningful return suggestions, no matter when it runs.
 * Amounts are drawn from real moi denominations (they traditionally end in 1 —
 * the auspicious extra rupee), so function totals are whatever the entries
 * actually add up to rather than a hard-coded headline number.
 */

/** Mulberry32 — small, fast, fully deterministic PRNG. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VILLAGES = ['Tenkasi', 'Madurai', 'Sankarankoil', 'Courtallam', 'Sivagiri', 'Rajapalayam'];

const GIVEN_NAMES = [
  'Murugan', 'Ravi Kumar', 'Kumar', 'Selvam', 'Suresh', 'Priya', 'Anand',
  'Meena', 'Karuppasamy', 'Lakshmi', 'Ganesan', 'Saravanan', 'Devi', 'Bala',
  'Chandran', 'Vijaya', 'Ramesh', 'Shanthi', 'Muthu', 'Kavitha', 'Arumugam',
  'Rajesh', 'Nithya', 'Palani', 'Gowri', 'Sundar', 'Revathi', 'Mani',
  'Sivakumar', 'Pandi', 'Alagu', 'Thangam', 'Vetri', 'Kalaiselvi', 'Perumal',
  'Ilango', 'Jeyanthi', 'Subramani', 'Amutha', 'Velu', 'Rani', 'Natarajan',
  'Sasikala', 'Dhanraj', 'Ponnusamy', 'Malathi', 'Ezhil', 'Sakthivel',
];

/**
 * Initials are how people are actually distinguished in Tamil contact books
 * ("R. Murugan", "S. Lakshmi"). Pairing them with the given names above yields
 * far more distinct people than a bare name list, so a 220-guest wedding has
 * 188 genuinely different givers rather than the same few repeated.
 */
const INITIALS = ['A', 'B', 'C', 'G', 'K', 'M', 'N', 'P', 'R', 'S', 'T', 'V'];

/** How many people the demo contact book holds. */
const PEOPLE_COUNT = 240;

const FAMILY_NAMES = [
  'Murugan Family', 'Ravi Family', 'Kumar Family', 'Selvam Family',
  'Suresh Family', 'Chandran Family', 'Palani Family', 'Ganesan Family',
];

const RELATIONS = ['Mama', 'Athai', 'Friend', 'Neighbour', 'Cousin', 'Colleague', 'Relative'];

/**
 * Real moi denominations, repeated in rough proportion to how often each is
 * actually given. Weighted so the mean lands near ₹1,600 — close relatives
 * give in the thousands, but the bulk of a guest list gives ₹501–₹2,001.
 */
const DENOMINATIONS = [
  101, 101,
  201, 201, 201,
  501, 501, 501, 501, 501, 501, 501, 501,
  1001, 1001, 1001, 1001, 1001, 1001, 1001, 1001, 1001, 1001,
  1501, 1501, 1501, 1501, 1501,
  2001, 2001, 2001, 2001, 2001,
  2501, 2501, 2501,
  3001, 3001,
  5001, 5001,
  10001,
];

const PAYMENT_TYPES: PaymentType[] = ['cash', 'cash', 'cash', 'upi', 'upi', 'other'];

/**
 * How a function's budget typically splits, as a share of total spend. The
 * generator turns these into individual expense rows so every total in the app
 * is summed from data rather than stored (spec §39).
 */
const EXPENSE_MIX: Array<{ category: ExpenseCategory; share: number; note: string }> = [
  { category: 'hall', share: 0.22, note: 'Mandapam booking' },
  { category: 'food', share: 0.34, note: 'Catering for all sessions' },
  { category: 'decoration', share: 0.12, note: 'Stage and entrance flowers' },
  { category: 'photography', share: 0.1, note: 'Photo and video team' },
  { category: 'music', share: 0.06, note: 'Nadaswaram troupe' },
  { category: 'clothing', share: 0.08, note: 'Family silks' },
  { category: 'invitation', share: 0.04, note: 'Printed invitations' },
  { category: 'transport', share: 0.04, note: 'Bus for relatives' },
];

const PAID_BY = ['Karthick', 'Appa', 'Mama', 'Anna', 'Chithappa'];

const MOI_NOTES = [
  undefined, undefined, undefined,
  'Happy wishes to Harthick',
  'Given on behalf of the family',
  'Received at the gate',
  'Paid via GPay',
];

/** Functions the household hosts, newest first. `inDays` is relative to today. */
const FUNCTION_BLUEPRINT: Array<{
  title: string;
  type: FunctionType;
  inDays: number;
  time: string;
  village: string;
  venue: string;
  entries: number;
  budget?: number;
  notes?: string;
}> = [
  {
    title: 'Harthick Ear Piercing', type: 'ear_piercing', inDays: 10, time: '10:00 AM',
    village: 'Tenkasi', venue: 'Sri Lakshmi Mahal, Tenkasi', entries: 0,
    budget: 125000,
    notes: 'We are happy to invite you and your family to bless Harthick.',
  },
  {
    title: 'Mahesh Upanayanam', type: 'upanayanam', inDays: 34, time: '07:30 AM',
    village: 'Madurai', venue: 'Vinayaka Thirumana Mandapam, Madurai', entries: 0,
    budget: 74000,
    notes: 'Thread ceremony followed by lunch.',
  },
  {
    title: 'Karthick Wedding', type: 'wedding', inDays: -133, time: '09:15 AM',
    village: 'Madurai', venue: 'Meenakshi Thirumana Mahal, Madurai', entries: 188,
    budget: 320000,
  },
  {
    title: 'House Warming', type: 'house_warming', inDays: -172, time: '06:00 AM',
    village: 'Tenkasi', venue: 'New House, Bharathi Nagar, Tenkasi', entries: 118,
    budget: 96000,
  },
  {
    title: 'Baby Shower', type: 'baby_shower', inDays: -216, time: '11:00 AM',
    village: 'Madurai', venue: 'Home, Anna Nagar, Madurai', entries: 64,
    budget: 42000,
  },
  {
    title: 'Harthick Birthday Party', type: 'birthday', inDays: -260, time: '05:00 PM',
    village: 'Tenkasi', venue: 'Home, Tenkasi', entries: 58,
    budget: 28000,
  },
  {
    title: 'Deepa Puberty Function', type: 'puberty', inDays: -318, time: '08:30 AM',
    village: 'Sankarankoil', venue: 'Community Hall, Sankarankoil', entries: 72,
    budget: 54000,
  },
  {
    title: 'Vetri Engagement', type: 'engagement', inDays: -402, time: '10:45 AM',
    village: 'Courtallam', venue: 'Falls View Mahal, Courtallam', entries: 49,
    budget: 38000,
  },
];

/** Functions hosted by guests — these are what a return moi is given for. */
const PERSON_EVENT_BLUEPRINT: Array<{
  personIndex: number; title: string; type: FunctionType; inDays: number;
}> = [
  { personIndex: 0, title: 'Murugan Marriage', type: 'wedding', inDays: 1 },
  { personIndex: 1, title: 'House Warming', type: 'house_warming', inDays: 3 },
  { personIndex: 3, title: 'Baby Shower', type: 'baby_shower', inDays: 5 },
  { personIndex: 2, title: 'Upanayanam', type: 'upanayanam', inDays: 10 },
  { personIndex: 4, title: 'Kavin Ear Piercing', type: 'ear_piercing', inDays: 16 },
  { personIndex: 5, title: 'Priya Wedding', type: 'wedding', inDays: 24 },
  { personIndex: 8, title: 'Grahapravesam', type: 'house_warming', inDays: 31 },
  { personIndex: 11, title: 'Sixtieth Birthday', type: 'birthday', inDays: 45 },
];

function pick<T>(list: T[], r: () => number): T {
  return list[Math.floor(r() * list.length)];
}

/** Builds the full demo dataset. Called once, or again on "reset demo data". */
export function buildSeed(now = new Date()): BackupPayload {
  const r = rng(20260728);
  const nowISO = now.toISOString();

  const families: Family[] = FAMILY_NAMES.map((name, i) => ({
    id: `fam_${i + 1}`,
    name,
    village: VILLAGES[i % VILLAGES.length],
    createdAt: nowISO,
  }));

  const people: Person[] = Array.from({ length: PEOPLE_COUNT }, (_, i) => {
    const given = GIVEN_NAMES[i % GIVEN_NAMES.length];
    const initial = INITIALS[Math.floor(i / GIVEN_NAMES.length) % INITIALS.length];
    // The first few keep bare names so the familiar demo faces stay recognisable.
    const name = i < GIVEN_NAMES.length ? given : `${initial}. ${given}`;
    const village = VILLAGES[Math.floor(r() * VILLAGES.length)];
    const family = families[i % families.length];
    return {
      id: `per_${i + 1}`,
      name,
      // Demo-only numbers in the reserved 9xxxx range.
      phone: `9${String(8000000000 + Math.floor(r() * 999999999)).slice(1)}`,
      village,
      familyId: family.id,
      relation: pick(RELATIONS, r),
      createdAt: nowISO,
    };
  });

  // Point each family's head at its first member.
  for (const family of families) {
    family.headPersonId = people.find((p) => p.familyId === family.id)?.id;
  }

  const functions: FunctionEvent[] = [];
  const moiEntries: MoiEntry[] = [];
  const expenses: Expense[] = [];

  FUNCTION_BLUEPRINT.forEach((bp, fi) => {
    const date = toISODate(addDays(now, bp.inDays));
    const fn: FunctionEvent = {
      id: `fn_${fi + 1}`,
      title: bp.title,
      type: bp.type,
      date,
      time: bp.time,
      venue: bp.venue,
      village: bp.village,
      notes: bp.notes,
      host: 'Karthick',
      createdAt: toISODate(addDays(now, bp.inDays - 45)),
      photos: [],
    };
    functions.push(fn);

    // Entries are recorded on the day of the function, spread across the
    // morning, and every entry belongs to a distinct person.
    const donorCount = Math.min(bp.entries, people.length);
    const donors = [...people].sort(() => r() - 0.5).slice(0, donorCount);
    donors.forEach((person, idx) => {
      const minutesIn = 30 + Math.floor((idx / Math.max(donors.length, 1)) * 300);
      const recordedAt = new Date(`${date}T04:00:00.000Z`);
      recordedAt.setUTCMinutes(recordedAt.getUTCMinutes() + minutesIn);
      moiEntries.push({
        id: `moi_${fi + 1}_${idx + 1}`,
        functionId: fn.id,
        personId: person.id,
        amount: pick(DENOMINATIONS, r),
        paymentType: pick(PAYMENT_TYPES, r),
        notes: pick(MOI_NOTES, r),
        recordedAt: recordedAt.toISOString(),
      });
    });

    // Expenses: split the function's budget across the usual categories, with
    // a little jitter so the figures don't look mechanically proportional.
    if (bp.budget) {
      EXPENSE_MIX.forEach((mix, mi) => {
        const jitter = 0.85 + r() * 0.3;
        const amount = Math.round((bp.budget! * mix.share * jitter) / 10) * 10;
        if (amount <= 0) return;
        expenses.push({
          id: `exp_${fi + 1}_${mi + 1}`,
          functionId: fn.id,
          category: mix.category,
          amount,
          paymentType: pick(PAYMENT_TYPES, r),
          paidBy: pick(PAID_BY, r),
          // Most spending happens in the fortnight before the function.
          date: toISODate(addDays(fromISODate(date), -Math.floor(r() * 14))),
          notes: mix.note,
          createdAt: nowISO,
        });
      });
    }

  });

  const personEvents: PersonEvent[] = PERSON_EVENT_BLUEPRINT.map((bp, i) => ({
    id: `pev_${i + 1}`,
    personId: people[bp.personIndex].id,
    title: bp.title,
    type: bp.type,
    date: toISODate(addDays(now, bp.inDays)),
    village: people[bp.personIndex].village,
    createdAt: nowISO,
  }));

  /**
   * Moi already returned. Only the first few guest events are settled, so the
   * demo shows all three balance states: still to return, given ahead, settled.
   */
  const moiGiven: MoiGiven[] = personEvents.slice(0, 3).map((event, i) => {
    const received = moiEntries
      .filter((m) => m.personId === event.personId)
      .reduce((total, m) => total + m.amount, 0);
    // The middle one is deliberately generous so a "given ahead" row exists.
    const amount = i === 1 ? received + 1000 : Math.max(Math.round(received / 2), 101);
    return {
      id: `giv_${i + 1}`,
      personId: event.personId,
      personEventId: event.id,
      occasion: event.title,
      amount,
      paymentType: pick(PAYMENT_TYPES, r),
      date: toISODate(addDays(fromISODate(event.date), -1)),
      createdAt: nowISO,
    };
  });

  const familyMembers: FamilyMember[] = [
    { id: 'mem_1', name: 'Karthick', phone: '9876543210', role: 'owner', isSelf: true, createdAt: nowISO },
    { id: 'mem_2', name: 'Meena', phone: '9876543211', role: 'admin', createdAt: nowISO },
    { id: 'mem_3', name: 'Bala', phone: '9876543212', role: 'editor', createdAt: nowISO },
    { id: 'mem_4', name: 'Thangam', phone: '9876543213', role: 'viewer', createdAt: nowISO },
  ];

  const profile: UserProfile = {
    id: 'me',
    name: 'Karthick',
    phone: '9876543210',
    email: 'karthick@example.com',
    village: 'Tenkasi',
  };

  const settings: AppSettings = {
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
  };

  return {
    version: 1,
    exportedAt: nowISO,
    people,
    families,
    functions,
    moiEntries,
    moiGiven,
    expenses,
    personEvents,
    familyMembers,
    profile,
    settings,
  };
}
