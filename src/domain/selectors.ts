import type {
  Dataset, Expense, ExpenseCategory, FunctionEvent, FunctionStatus, ID, ISODate,
  MoiEntry, MoiGiven, PaymentType, Person, PersonEvent,
} from './models';
import { expenseCategoryMeta } from './categories';
import { daysUntil, fromISODate, isUpcoming } from '../utils/date';

/**
 * Every derived view in the app — home totals, function stats, all six reports
 * — is a pure function of a `Dataset` snapshot. Nothing here touches storage,
 * React, or the network, so each can be unit tested in isolation.
 */

// ---------------------------------------------------------------- functions

export interface FunctionWithStats extends FunctionEvent {
  status: FunctionStatus;
  /** Rupees collected across all recorded moi entries. */
  collected: number;
  /** Number of moi entries recorded. */
  entryCount: number;
  /** Rupees spent — summed from expense rows, never stored (spec §39). */
  expenses: number;
  /** Number of expense rows. */
  expenseCount: number;
  /** Days until the function; negative once it has passed. */
  daysAway: number;
  /** collected − expenses. */
  net: number;
}

export function functionStatus(fn: FunctionEvent, now = new Date()): FunctionStatus {
  return isUpcoming(fn.date, now) ? 'upcoming' : 'completed';
}

export function withFunctionStats(
  fn: FunctionEvent,
  data: Pick<Dataset, 'moiEntries' | 'expenses'>,
  now = new Date(),
): FunctionWithStats {
  const entries = data.moiEntries.filter((e) => e.functionId === fn.id);
  const expenseRows = data.expenses.filter((e) => e.functionId === fn.id);

  const collected = sumAmount(entries);
  const expenses = expenseRows.reduce((total, e) => total + e.amount, 0);

  return {
    ...fn,
    status: functionStatus(fn, now),
    collected,
    entryCount: entries.length,
    expenses,
    expenseCount: expenseRows.length,
    daysAway: daysUntil(fn.date, now),
    net: collected - expenses,
  };
}

/** All functions, newest date first, each carrying its computed totals. */
export function selectFunctions(data: Dataset, now = new Date()): FunctionWithStats[] {
  return data.functions
    .map((fn) => withFunctionStats(fn, data, now))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function selectFunctionById(
  data: Dataset,
  id: ID,
  now = new Date(),
): FunctionWithStats | undefined {
  const fn = data.functions.find((f) => f.id === id);
  return fn ? withFunctionStats(fn, data, now) : undefined;
}

/** Upcoming functions, soonest first. */
export function selectUpcomingFunctions(data: Dataset, now = new Date()): FunctionWithStats[] {
  return selectFunctions(data, now)
    .filter((f) => f.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Completed functions, most recent first. */
export function selectCompletedFunctions(data: Dataset, now = new Date()): FunctionWithStats[] {
  return selectFunctions(data, now).filter((f) => f.status === 'completed');
}

/** The single function the home screen highlights, if there is one. */
export function selectNextFunction(data: Dataset, now = new Date()): FunctionWithStats | undefined {
  return selectUpcomingFunctions(data, now)[0];
}

// ------------------------------------------------------------------- moi

export function sumAmount(entries: MoiEntry[]): number {
  return entries.reduce((total, e) => total + e.amount, 0);
}

export interface MoiEntryView extends MoiEntry {
  person?: Person;
  functionTitle?: string;
}

/** Moi entries for one function, most recently recorded first. */
export function selectMoiEntriesForFunction(
  data: Dataset,
  functionId: ID,
): MoiEntryView[] {
  const peopleById = indexBy(data.people, (p) => p.id);
  return data.moiEntries
    .filter((e) => e.functionId === functionId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .map((e) => ({ ...e, person: peopleById.get(e.personId) }));
}

/** Every moi entry a person has given us, most recent function first. */
export function selectMoiEntriesForPerson(data: Dataset, personId: ID): MoiEntryView[] {
  const functionsById = indexBy(data.functions, (f) => f.id);
  return data.moiEntries
    .filter((e) => e.personId === personId)
    .sort((a, b) => {
      const da = functionsById.get(a.functionId)?.date ?? '';
      const db = functionsById.get(b.functionId)?.date ?? '';
      return db.localeCompare(da);
    })
    .map((e) => ({ ...e, functionTitle: functionsById.get(e.functionId)?.title }));
}

/** One row of a person's moi history, in either direction. */
export interface MoiTimelineRow {
  id: ID;
  direction: 'received' | 'given';
  amount: number;
  date: ISODate;
  paymentType: PaymentType;
  /** The function it relates to — ours when received, theirs when given. */
  title: string;
  notes?: string;
  /** Set on received rows, so the row can open the function. */
  functionId?: ID;
}

/**
 * A person's moi in both directions on one timeline, newest first.
 *
 * Received and given are separate records, but the host thinks of them as one
 * running account with that person — so the profile shows them interleaved
 * rather than in two disconnected lists.
 */
export function selectMoiTimelineForPerson(data: Dataset, personId: ID): MoiTimelineRow[] {
  const functionsById = indexBy(data.functions, (f) => f.id);

  const received: MoiTimelineRow[] = data.moiEntries
    .filter((e) => e.personId === personId)
    .map((e) => ({
      id: e.id,
      direction: 'received' as const,
      amount: e.amount,
      date: functionsById.get(e.functionId)?.date ?? e.recordedAt.slice(0, 10),
      paymentType: e.paymentType,
      title: functionsById.get(e.functionId)?.title ?? 'Function',
      notes: e.notes,
      functionId: e.functionId,
    }));

  const given: MoiTimelineRow[] = data.moiGiven
    .filter((g) => g.personId === personId)
    .map((g) => ({
      id: g.id,
      direction: 'given' as const,
      amount: g.amount,
      date: g.date,
      paymentType: g.paymentType,
      title: g.occasion || 'Moi given',
      notes: g.notes,
    }));

  return [...received, ...given].sort((a, b) => b.date.localeCompare(a.date));
}

export type BalanceState = 'to-return' | 'ahead' | 'settled';

export interface BalanceSummary {
  state: BalanceState;
  /** Always positive — the wording carries the direction. */
  amount: number;
}

/** Turns a signed balance into the state the UI words it with. */
export function describeBalance(balance: number): BalanceSummary {
  if (balance > 0) return { state: 'to-return', amount: balance };
  if (balance < 0) return { state: 'ahead', amount: Math.abs(balance) };
  return { state: 'settled', amount: 0 };
}

// ---------------------------------------------------------------- people

export interface PersonWithStats extends Person {
  /** Total rupees this person has given the household. */
  totalReceived: number;
  /** Total rupees the household has given back to them. */
  totalGiven: number;
  /**
   * `totalReceived - totalGiven`. Positive means they have given more than
   * they have had back, so the household still owes a return.
   */
  balance: number;
  /** How many of our functions they contributed to. */
  functionCount: number;
  /** Their most recent contribution, if any. */
  lastAmount?: number;
  lastFunctionId?: ID;
  lastDate?: ISODate;
  familyName?: string;
}

export function selectPeople(data: Dataset): PersonWithStats[] {
  const functionsById = indexBy(data.functions, (f) => f.id);
  const familiesById = indexBy(data.families, (f) => f.id);

  // One pass over entries rather than filtering per person — keeps the People
  // tab O(n) instead of O(people × entries).
  const byPerson = new Map<ID, MoiEntry[]>();
  for (const entry of data.moiEntries) {
    const list = byPerson.get(entry.personId);
    if (list) list.push(entry);
    else byPerson.set(entry.personId, [entry]);
  }

  const givenByPerson = new Map<ID, MoiGiven[]>();
  for (const given of data.moiGiven) {
    const list = givenByPerson.get(given.personId);
    if (list) list.push(given);
    else givenByPerson.set(given.personId, [given]);
  }

  return data.people
    .map((person) => {
      const entries = byPerson.get(person.id) ?? [];
      const dated = entries
        .map((e) => ({ entry: e, date: functionsById.get(e.functionId)?.date ?? '' }))
        .sort((a, b) => b.date.localeCompare(a.date));
      const latest = dated[0];
      const totalReceived = sumAmount(entries);
      const totalGiven = (givenByPerson.get(person.id) ?? []).reduce(
        (total, g) => total + g.amount,
        0,
      );
      return {
        ...person,
        totalReceived,
        totalGiven,
        balance: totalReceived - totalGiven,
        functionCount: new Set(entries.map((e) => e.functionId)).size,
        lastAmount: latest?.entry.amount,
        lastFunctionId: latest?.entry.functionId,
        lastDate: latest?.date || undefined,
        familyName: person.familyId ? familiesById.get(person.familyId)?.name : undefined,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function selectPersonById(data: Dataset, id: ID): PersonWithStats | undefined {
  return selectPeople(data).find((p) => p.id === id);
}

// --------------------------------------------------------------- overview

export interface OverviewStats {
  functionCount: number;
  upcomingCount: number;
  totalMoi: number;
  peopleCount: number;
  entryCount: number;
  totalExpenses: number;
  averageMoi: number;
  /** Moi collected minus everything spent. */
  balance: number;
}

/** The three headline tiles on the home screen, plus a few extras. */
export function selectOverview(data: Dataset, now = new Date()): OverviewStats {
  const totalMoi = sumAmount(data.moiEntries);
  const entryCount = data.moiEntries.length;
  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);

  return {
    functionCount: data.functions.length,
    upcomingCount: data.functions.filter((f) => isUpcoming(f.date, now)).length,
    totalMoi,
    peopleCount: data.people.length,
    entryCount,
    totalExpenses,
    averageMoi: entryCount ? Math.round(totalMoi / entryCount) : 0,
    balance: totalMoi - totalExpenses,
  };
}

/** The most recently recorded moi entries across every function. */
export function selectRecentMoi(data: Dataset, limit = 5): MoiEntryView[] {
  const peopleById = indexBy(data.people, (p) => p.id);
  const functionsById = indexBy(data.functions, (f) => f.id);
  return [...data.moiEntries]
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, limit)
    .map((e) => ({
      ...e,
      person: peopleById.get(e.personId),
      functionTitle: functionsById.get(e.functionId)?.title,
    }));
}

// -------------------------------------------------------------- expenses

export interface ExpenseView extends Expense {
  functionTitle?: string;
}

/** Expenses for one function, newest first. */
export function selectExpensesForFunction(data: Dataset, functionId: ID): Expense[] {
  return data.expenses
    .filter((e) => e.functionId === functionId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface PaymentSplit {
  cash: number;
  upi: number;
  other: number;
  total: number;
}

/** Splits any set of amounts by how they were paid (spec §9, §14). */
export function splitByPaymentType(
  rows: Array<{ amount: number; paymentType: PaymentType }>,
): PaymentSplit {
  const split: PaymentSplit = { cash: 0, upi: 0, other: 0, total: 0 };
  for (const row of rows) {
    split[row.paymentType] += row.amount;
    split.total += row.amount;
  }
  return split;
}

// ---------------------------------------------------------------- reports

export interface DateRange {
  /** Inclusive lower bound, or undefined for "no lower bound". */
  from?: ISODate;
  /** Inclusive upper bound. */
  to?: ISODate;
}

function inRange(date: ISODate, range?: DateRange): boolean {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

/** Restricts a dataset to the functions (and their entries) inside a range. */
export function filterByRange(data: Dataset, range?: DateRange): Dataset {
  if (!range?.from && !range?.to) return data;
  const functions = data.functions.filter((f) => inRange(f.date, range));
  const ids = new Set(functions.map((f) => f.id));
  return {
    ...data,
    functions,
    moiEntries: data.moiEntries.filter((e) => ids.has(e.functionId)),
    expenses: data.expenses.filter((e) => ids.has(e.functionId)),
  };
}

export interface FunctionReportRow {
  id: ID;
  title: string;
  date: ISODate;
  type: FunctionEvent['type'];
  collected: number;
  entryCount: number;
  expenses: number;
}

export interface FunctionReport {
  rows: FunctionReportRow[];
  totalCollection: number;
  totalFunctions: number;
  averageMoi: number;
  totalExpenses: number;
}

export function buildFunctionReport(data: Dataset, range?: DateRange): FunctionReport {
  const scoped = filterByRange(data, range);
  const rows: FunctionReportRow[] = scoped.functions
    .map((fn) => {
      const stats = withFunctionStats(fn, scoped);
      return {
        id: fn.id,
        title: fn.title,
        date: fn.date,
        type: fn.type,
        collected: stats.collected,
        entryCount: stats.entryCount,
        expenses: stats.expenses,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalCollection = rows.reduce((s, r) => s + r.collected, 0);
  const totalEntries = rows.reduce((s, r) => s + r.entryCount, 0);

  return {
    rows,
    totalCollection,
    totalFunctions: rows.length,
    averageMoi: totalEntries ? Math.round(totalCollection / totalEntries) : 0,
    totalExpenses: rows.reduce((s, r) => s + r.expenses, 0),
  };
}

export interface PersonReportRow {
  id: ID;
  name: string;
  village?: string;
  phone?: string;
  total: number;
  functionCount: number;
}

export function buildPersonReport(data: Dataset, range?: DateRange): PersonReportRow[] {
  const scoped = filterByRange(data, range);
  const peopleById = indexBy(scoped.people, (p) => p.id);
  const totals = new Map<ID, { total: number; functions: Set<ID> }>();

  for (const entry of scoped.moiEntries) {
    const bucket = totals.get(entry.personId) ?? { total: 0, functions: new Set<ID>() };
    bucket.total += entry.amount;
    bucket.functions.add(entry.functionId);
    totals.set(entry.personId, bucket);
  }

  return [...totals.entries()]
    .map(([personId, bucket]) => {
      const person = peopleById.get(personId);
      return {
        id: personId,
        name: person?.name ?? 'Unknown',
        village: person?.village,
        phone: person?.phone,
        total: bucket.total,
        functionCount: bucket.functions.size,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export interface GroupReportRow {
  key: string;
  label: string;
  total: number;
  peopleCount: number;
  entryCount: number;
}

/** Collections grouped by the giver's village. */
export function buildVillageReport(data: Dataset, range?: DateRange): GroupReportRow[] {
  const scoped = filterByRange(data, range);
  const peopleById = indexBy(scoped.people, (p) => p.id);
  return groupEntries(scoped.moiEntries, (entry) => {
    const village = peopleById.get(entry.personId)?.village;
    return village ? { key: village, label: village } : { key: '__none', label: 'Not specified' };
  });
}

/** Collections grouped by the giver's family. */
export function buildFamilyReport(data: Dataset, range?: DateRange): GroupReportRow[] {
  const scoped = filterByRange(data, range);
  const peopleById = indexBy(scoped.people, (p) => p.id);
  const familiesById = indexBy(scoped.families, (f) => f.id);
  return groupEntries(scoped.moiEntries, (entry) => {
    const familyId = peopleById.get(entry.personId)?.familyId;
    const family = familyId ? familiesById.get(familyId) : undefined;
    return family
      ? { key: family.id, label: family.name }
      : { key: '__none', label: 'No family' };
  });
}

function groupEntries(
  entries: MoiEntry[],
  classify: (entry: MoiEntry) => { key: string; label: string },
): GroupReportRow[] {
  const groups = new Map<string, { label: string; total: number; people: Set<ID>; count: number }>();
  for (const entry of entries) {
    const { key, label } = classify(entry);
    const group = groups.get(key) ?? { label, total: 0, people: new Set<ID>(), count: 0 };
    group.total += entry.amount;
    group.people.add(entry.personId);
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      label: g.label,
      total: g.total,
      peopleCount: g.people.size,
      entryCount: g.count,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface TopContributorRow extends PersonReportRow {
  rank: number;
  /** Share of the total collection, 0–1. */
  share: number;
}

export function buildTopContributors(
  data: Dataset,
  limit = 20,
  range?: DateRange,
): TopContributorRow[] {
  const rows = buildPersonReport(data, range);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  return rows.slice(0, limit).map((row, i) => ({
    ...row,
    rank: i + 1,
    share: grandTotal ? row.total / grandTotal : 0,
  }));
}

export interface ReturnMoiRow {
  person: Person;
  event: PersonEvent;
  daysAway: number;
  /** The most recent moi this person gave the household. */
  lastReceived: number;
  /** Total they have ever given. */
  totalReceived: number;
  /** What the app recommends returning. */
  suggested: number;
  /** Already given for this event. */
  returned: number;
  familyName?: string;
}

/**
 * People hosting a function soon, whom the household owes a return moi.
 *
 * The suggestion mirrors the custom: return at least what they last gave.
 * Settings can round the figure up and add the auspicious extra rupee.
 */
export function buildReturnMoiReport(
  data: Dataset,
  options: { withinDays?: number; now?: Date } = {},
): ReturnMoiRow[] {
  const { withinDays = 90, now = new Date() } = options;
  const peopleById = indexBy(data.people, (p) => p.id);
  const familiesById = indexBy(data.families, (f) => f.id);
  const functionsById = indexBy(data.functions, (f) => f.id);
  const { suggestionRounding, auspiciousRupee } = data.settings;

  // What has already been given towards each of their functions, summed from
  // the moi-given records rather than stored on the event.
  const givenByEvent = new Map<ID, number>();
  for (const given of data.moiGiven) {
    if (!given.personEventId) continue;
    givenByEvent.set(
      given.personEventId,
      (givenByEvent.get(given.personEventId) ?? 0) + given.amount,
    );
  }

  const rows: ReturnMoiRow[] = [];

  for (const event of data.personEvents) {
    const person = peopleById.get(event.personId);
    if (!person) continue;

    const daysAway = daysUntil(event.date, now);
    if (daysAway < 0 || daysAway > withinDays) continue;

    const given = data.moiEntries.filter((e) => e.personId === person.id);

    // "Last received" is what they gave on their most recent *occasion*, not
    // one arbitrary row: if someone was recorded twice at the same function,
    // the amount we owe back is the total they gave that day. Summing per
    // function also removes the tie-break ambiguity between same-date entries.
    const latestDate = given.reduce((latest, entry) => {
      const date = functionsById.get(entry.functionId)?.date ?? '';
      return date > latest ? date : latest;
    }, '');

    const lastReceived = given
      .filter((e) => (functionsById.get(e.functionId)?.date ?? '') === latestDate)
      .reduce((total, e) => total + e.amount, 0);
    rows.push({
      person,
      event,
      daysAway,
      lastReceived,
      totalReceived: sumAmount(given),
      suggested: suggestReturnAmount(lastReceived, suggestionRounding, auspiciousRupee),
      returned: givenByEvent.get(event.id) ?? 0,
      familyName: person.familyId ? familiesById.get(person.familyId)?.name : undefined,
    });
  }

  return rows.sort((a, b) => a.daysAway - b.daysAway);
}

/**
 * Rounds a return amount up to the configured multiple and optionally adds the
 * auspicious extra rupee, e.g. 1001 → 1001, 1250 → 1301 (rounding 100, +1).
 */
export function suggestReturnAmount(
  lastReceived: number,
  rounding: number,
  auspiciousRupee: boolean,
): number {
  if (lastReceived <= 0) return 0;
  const base = auspiciousRupee ? lastReceived - 1 : lastReceived;
  const step = Math.max(rounding, 1);
  const rounded = Math.ceil(base / step) * step;
  return auspiciousRupee ? rounded + 1 : rounded;
}

// ----------------------------------------------------------------- search

/** Case-insensitive match across a person's name, phone and village. */
export function matchesPerson(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    person.name.toLowerCase().includes(q) ||
    (person.phone ?? '').includes(q) ||
    (person.village ?? '').toLowerCase().includes(q) ||
    (person.relation ?? '').toLowerCase().includes(q)
  );
}

export function matchesFunction(fn: FunctionEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    fn.title.toLowerCase().includes(q) ||
    (fn.venue ?? '').toLowerCase().includes(q) ||
    (fn.village ?? '').toLowerCase().includes(q)
  );
}

/** Distinct village names present in the data, alphabetically. */
export function selectVillages(data: Dataset): string[] {
  const set = new Set<string>();
  for (const p of data.people) if (p.village) set.add(p.village);
  for (const f of data.functions) if (f.village) set.add(f.village);
  return [...set].sort((a, b) => a.localeCompare(b));
}


// --- expense, payment-method and collection reports (spec §15) ---

export interface ExpenseReportRow {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  tint: string;
  total: number;
  count: number;
}

export interface ExpenseReport {
  rows: ExpenseReportRow[];
  total: number;
  split: PaymentSplit;
  /** Expenses that could not be matched to a category, if any. */
  functionCount: number;
}

export function buildExpenseReport(data: Dataset, range?: DateRange): ExpenseReport {
  const scoped = filterByRange(data, range);
  const byCategory = new Map<ExpenseCategory, { total: number; count: number }>();

  for (const expense of scoped.expenses) {
    const bucket = byCategory.get(expense.category) ?? { total: 0, count: 0 };
    bucket.total += expense.amount;
    bucket.count += 1;
    byCategory.set(expense.category, bucket);
  }

  const rows: ExpenseReportRow[] = [...byCategory.entries()]
    .map(([key, bucket]) => {
      const meta = expenseCategoryMeta(key);
      return {
        key,
        label: meta.label,
        emoji: meta.emoji,
        tint: meta.tint,
        total: bucket.total,
        count: bucket.count,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    rows,
    total: rows.reduce((sum, r) => sum + r.total, 0),
    split: splitByPaymentType(scoped.expenses),
    functionCount: new Set(scoped.expenses.map((e) => e.functionId)).size,
  };
}

export interface PaymentMethodReport {
  moi: PaymentSplit;
  expenses: PaymentSplit;
  /** Entry counts per method, for the moi side. */
  moiCounts: Record<PaymentType, number>;
}

export function buildPaymentMethodReport(
  data: Dataset,
  range?: DateRange,
): PaymentMethodReport {
  const scoped = filterByRange(data, range);
  const moiCounts: Record<PaymentType, number> = { cash: 0, upi: 0, other: 0 };
  for (const entry of scoped.moiEntries) moiCounts[entry.paymentType] += 1;

  return {
    moi: splitByPaymentType(scoped.moiEntries),
    expenses: splitByPaymentType(scoped.expenses),
    moiCounts,
  };
}

export interface CollectionReportRow {
  /** `YYYY-MM`, so rows sort chronologically as strings. */
  month: string;
  total: number;
  entryCount: number;
}

export interface CollectionReport {
  rows: CollectionReportRow[];
  total: number;
  split: PaymentSplit;
  averageEntry: number;
  /** Largest single monthly total, for drawing proportional bars. */
  peak: number;
}

/** Moi collected over time, grouped by the month of the function. */
export function buildCollectionReport(data: Dataset, range?: DateRange): CollectionReport {
  const scoped = filterByRange(data, range);
  const functionsById = indexBy(scoped.functions, (f) => f.id);
  const byMonth = new Map<string, { total: number; count: number }>();

  for (const entry of scoped.moiEntries) {
    const date = functionsById.get(entry.functionId)?.date;
    if (!date) continue;
    const month = date.slice(0, 7);
    const bucket = byMonth.get(month) ?? { total: 0, count: 0 };
    bucket.total += entry.amount;
    bucket.count += 1;
    byMonth.set(month, bucket);
  }

  const rows: CollectionReportRow[] = [...byMonth.entries()]
    .map(([month, bucket]) => ({ month, total: bucket.total, entryCount: bucket.count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const entryCount = rows.reduce((sum, r) => sum + r.entryCount, 0);

  return {
    rows,
    total,
    split: splitByPaymentType(scoped.moiEntries),
    averageEntry: entryCount ? Math.round(total / entryCount) : 0,
    peak: rows.reduce((max, r) => Math.max(max, r.total), 0),
  };
}

// ---------------------------------------------------------- global search

export type SearchResultKind = 'function' | 'person' | 'moi';

export interface SearchResult {
  kind: SearchResultKind;
  id: ID;
  title: string;
  subtitle: string;
  amount?: number;
  /** Route to open when the result is tapped. */
  href: string;
}

/**
 * One search across functions, people and moi entries (spec §17).
 * Results are grouped by kind at the call site; ordering here is by relevance
 * within each kind (exact prefix first, then any substring match).
 */
export function searchAll(data: Dataset, query: string, limitPerKind = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const results: SearchResult[] = [];
  const peopleById = indexBy(data.people, (p) => p.id);
  const functionsById = indexBy(data.functions, (f) => f.id);

  const rank = (text: string) => (text.toLowerCase().startsWith(q) ? 0 : 1);

  const functions = data.functions
    .filter((fn) => matchesFunction(fn, q))
    .sort((a, b) => rank(a.title) - rank(b.title) || b.date.localeCompare(a.date))
    .slice(0, limitPerKind);
  for (const fn of functions) {
    const stats = withFunctionStats(fn, data);
    results.push({
      kind: 'function',
      id: fn.id,
      title: fn.title,
      subtitle: `${fn.date}${fn.village ? ` · ${fn.village}` : ''}`,
      amount: stats.collected,
      href: `/function/${fn.id}`,
    });
  }

  const people = selectPeople(data)
    .filter((p) => matchesPerson(p, q))
    .sort((a, b) => rank(a.name) - rank(b.name) || b.totalGiven - a.totalGiven)
    .slice(0, limitPerKind);
  for (const person of people) {
    results.push({
      kind: 'person',
      id: person.id,
      title: person.name,
      subtitle: [person.village, person.phone].filter(Boolean).join(' · ') || 'No details',
      amount: person.totalReceived,
      href: `/person/${person.id}`,
    });
  }

  const entries = data.moiEntries
    .filter((entry) => {
      const person = peopleById.get(entry.personId);
      return (
        (person ? matchesPerson(person, q) : false) ||
        String(entry.amount).includes(q) ||
        (entry.notes ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    .slice(0, limitPerKind);
  for (const entry of entries) {
    results.push({
      kind: 'moi',
      id: entry.id,
      title: peopleById.get(entry.personId)?.name ?? 'Unknown',
      subtitle: functionsById.get(entry.functionId)?.title ?? 'Function',
      amount: entry.amount,
      href: `/function/${entry.functionId}`,
    });
  }

  return results;
}

// ----------------------------------------------------------------- helpers

function indexBy<T>(items: T[], key: (item: T) => ID): Map<ID, T> {
  const map = new Map<ID, T>();
  for (const item of items) map.set(key(item), item);
  return map;
}

/** Calendar year bounds, used as the default report range. */
export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function currentYearRange(now = new Date()): DateRange {
  return yearRange(now.getFullYear());
}

export { fromISODate };
