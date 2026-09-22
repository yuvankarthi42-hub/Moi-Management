import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AppSettings, Expense, Family, FamilyMember, FunctionEvent, Guest, ID, MoiEntry, Person,
  PersonEvent, UserProfile,
} from '../../domain/models';
import type {
  BackupPayload, DataSource, NewExpense, NewFamily, NewFamilyMember, NewFunction, NewGuest,
  NewMoiEntry, NewPerson, NewPersonEvent,
} from '../DataSource';
import { buildSeed } from './seed';

const STORAGE_KEY = 'moi-manager/db/v1';

/** Simulated latency so the UI's loading states are exercised in development. */
const LATENCY_MS = 0;

function delay(): Promise<void> {
  return LATENCY_MS > 0 ? new Promise((r) => setTimeout(r, LATENCY_MS)) : Promise.resolve();
}

/**
 * Brings a stored payload up to the current shape.
 *
 * Collections added in a later release are simply absent from an older store,
 * and reading `undefined.length` would break the app on first launch after an
 * update — so every collection is defaulted here rather than trusted.
 */
function migrate(stored: Partial<BackupPayload>): BackupPayload {
  const seed = buildSeed();
  return {
    version: 1,
    exportedAt: stored.exportedAt ?? new Date().toISOString(),
    people: stored.people ?? [],
    families: stored.families ?? [],
    functions: stored.functions ?? [],
    moiEntries: stored.moiEntries ?? [],
    expenses: stored.expenses ?? [],
    guests: stored.guests ?? [],
    personEvents: stored.personEvents ?? [],
    // A store predating family members gets the default owner row, so the
    // permission checks always have someone to resolve against.
    familyMembers: stored.familyMembers?.length ? stored.familyMembers : seed.familyMembers,
    profile: stored.profile ?? seed.profile,
    settings: { ...seed.settings, ...stored.settings },
  };
}

let idCounter = 0;
function newId(prefix: string): ID {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

/**
 * In-memory data source backed by AsyncStorage.
 *
 * The whole dataset is held in memory and flushed to AsyncStorage after every
 * mutation, which is more than fast enough at this scale (a heavy user has a
 * few thousand moi entries) and keeps reads synchronous internally. When the
 * app graduates to SQLite or a server, only this class is replaced.
 */
export class MockDataSource implements DataSource {
  private db: BackupPayload = buildSeed();
  private ready = false;
  /** Serialises writes so two quick saves can't interleave. */
  private flushChain: Promise<void> = Promise.resolve();

  async init(): Promise<void> {
    if (this.ready) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BackupPayload>;
        if (parsed?.version === 1) this.db = migrate(parsed);
      } else {
        // First launch — persist the demo dataset so edits survive a restart.
        this.db = buildSeed();
        await this.flush();
      }
    } catch {
      // A corrupt store must never block startup; fall back to fresh seed data.
      this.db = buildSeed();
    }
    this.ready = true;
  }

  private flush(): Promise<void> {
    this.flushChain = this.flushChain
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.db)))
      .catch(() => undefined);
    return this.flushChain;
  }

  private nowISO(): string {
    return new Date().toISOString();
  }

  // ---------------------------------------------------------------- people

  async listPeople(): Promise<Person[]> {
    await delay();
    return [...this.db.people];
  }

  async getPerson(id: ID): Promise<Person | undefined> {
    await delay();
    return this.db.people.find((p) => p.id === id);
  }

  async createPerson(input: NewPerson): Promise<Person> {
    const person: Person = { ...input, id: newId('per'), createdAt: this.nowISO() };
    this.db.people = [...this.db.people, person];
    await this.flush();
    return person;
  }

  async updatePerson(id: ID, patch: Partial<NewPerson>): Promise<Person> {
    const index = this.db.people.findIndex((p) => p.id === id);
    if (index < 0) throw new Error(`Person ${id} not found`);
    const updated = { ...this.db.people[index], ...patch };
    this.db.people = this.db.people.map((p, i) => (i === index ? updated : p));
    await this.flush();
    return updated;
  }

  async deletePerson(id: ID): Promise<void> {
    this.db.people = this.db.people.filter((p) => p.id !== id);
    // Cascade: a person's moi entries and their own events go with them.
    this.db.moiEntries = this.db.moiEntries.filter((m) => m.personId !== id);
    this.db.personEvents = this.db.personEvents.filter((e) => e.personId !== id);
    // Guest rows keep their denormalised name, but lose the broken link.
    this.db.guests = this.db.guests.map((g) =>
      g.personId === id ? { ...g, personId: undefined } : g,
    );
    await this.flush();
  }

  // -------------------------------------------------------------- families

  async listFamilies(): Promise<Family[]> {
    await delay();
    return [...this.db.families];
  }

  async createFamily(input: NewFamily): Promise<Family> {
    const family: Family = { ...input, id: newId('fam'), createdAt: this.nowISO() };
    this.db.families = [...this.db.families, family];
    await this.flush();
    return family;
  }

  async updateFamily(id: ID, patch: Partial<NewFamily>): Promise<Family> {
    const index = this.db.families.findIndex((f) => f.id === id);
    if (index < 0) throw new Error(`Family ${id} not found`);
    const updated = { ...this.db.families[index], ...patch };
    this.db.families = this.db.families.map((f, i) => (i === index ? updated : f));
    await this.flush();
    return updated;
  }

  async deleteFamily(id: ID): Promise<void> {
    this.db.families = this.db.families.filter((f) => f.id !== id);
    // Members survive — they simply become unaffiliated.
    this.db.people = this.db.people.map((p) =>
      p.familyId === id ? { ...p, familyId: undefined } : p,
    );
    await this.flush();
  }

  // ------------------------------------------------------------- functions

  async listFunctions(): Promise<FunctionEvent[]> {
    await delay();
    return [...this.db.functions];
  }

  async getFunction(id: ID): Promise<FunctionEvent | undefined> {
    await delay();
    return this.db.functions.find((f) => f.id === id);
  }

  async createFunction(input: NewFunction): Promise<FunctionEvent> {
    const fn: FunctionEvent = { ...input, id: newId('fn'), createdAt: this.nowISO() };
    this.db.functions = [...this.db.functions, fn];
    await this.flush();
    return fn;
  }

  async updateFunction(id: ID, patch: Partial<NewFunction>): Promise<FunctionEvent> {
    const index = this.db.functions.findIndex((f) => f.id === id);
    if (index < 0) throw new Error(`Function ${id} not found`);
    const updated = { ...this.db.functions[index], ...patch };
    this.db.functions = this.db.functions.map((f, i) => (i === index ? updated : f));
    await this.flush();
    return updated;
  }

  async deleteFunction(id: ID): Promise<void> {
    this.db.functions = this.db.functions.filter((f) => f.id !== id);
    // Moi, expenses and guests cannot outlive their function (spec §38).
    this.db.moiEntries = this.db.moiEntries.filter((m) => m.functionId !== id);
    this.db.expenses = this.db.expenses.filter((e) => e.functionId !== id);
    this.db.guests = this.db.guests.filter((g) => g.functionId !== id);
    await this.flush();
  }

  // ----------------------------------------------------------- moi entries

  async listMoiEntries(): Promise<MoiEntry[]> {
    await delay();
    return [...this.db.moiEntries];
  }

  async createMoiEntry(input: NewMoiEntry): Promise<MoiEntry> {
    const entry: MoiEntry = {
      ...input,
      id: newId('moi'),
      recordedAt: input.recordedAt ?? this.nowISO(),
    };
    this.db.moiEntries = [...this.db.moiEntries, entry];
    await this.flush();
    return entry;
  }

  async updateMoiEntry(id: ID, patch: Partial<NewMoiEntry>): Promise<MoiEntry> {
    const index = this.db.moiEntries.findIndex((m) => m.id === id);
    if (index < 0) throw new Error(`Moi entry ${id} not found`);
    const updated = { ...this.db.moiEntries[index], ...patch };
    this.db.moiEntries = this.db.moiEntries.map((m, i) => (i === index ? updated : m));
    await this.flush();
    return updated;
  }

  async deleteMoiEntry(id: ID): Promise<void> {
    this.db.moiEntries = this.db.moiEntries.filter((m) => m.id !== id);
    await this.flush();
  }

  // ------------------------------------------------------------- expenses

  async listExpenses(): Promise<Expense[]> {
    await delay();
    return [...this.db.expenses];
  }

  async createExpense(input: NewExpense): Promise<Expense> {
    const expense: Expense = { ...input, id: newId('exp'), createdAt: this.nowISO() };
    this.db.expenses = [...this.db.expenses, expense];
    await this.flush();
    return expense;
  }

  async updateExpense(id: ID, patch: Partial<NewExpense>): Promise<Expense> {
    const index = this.db.expenses.findIndex((e) => e.id === id);
    if (index < 0) throw new Error(`Expense ${id} not found`);
    const updated = { ...this.db.expenses[index], ...patch };
    this.db.expenses = this.db.expenses.map((e, i) => (i === index ? updated : e));
    await this.flush();
    return updated;
  }

  async deleteExpense(id: ID): Promise<void> {
    this.db.expenses = this.db.expenses.filter((e) => e.id !== id);
    await this.flush();
  }

  // --------------------------------------------------------------- guests

  async listGuests(): Promise<Guest[]> {
    await delay();
    return [...this.db.guests];
  }

  async createGuest(input: NewGuest): Promise<Guest> {
    const guest: Guest = { ...input, id: newId('gst'), createdAt: this.nowISO() };
    this.db.guests = [...this.db.guests, guest];
    await this.flush();
    return guest;
  }

  async updateGuest(id: ID, patch: Partial<NewGuest>): Promise<Guest> {
    const index = this.db.guests.findIndex((g) => g.id === id);
    if (index < 0) throw new Error(`Guest ${id} not found`);
    const updated = { ...this.db.guests[index], ...patch };
    this.db.guests = this.db.guests.map((g, i) => (i === index ? updated : g));
    await this.flush();
    return updated;
  }

  async deleteGuest(id: ID): Promise<void> {
    this.db.guests = this.db.guests.filter((g) => g.id !== id);
    await this.flush();
  }

  // ------------------------------------------------------- family members

  async listFamilyMembers(): Promise<FamilyMember[]> {
    await delay();
    return [...this.db.familyMembers];
  }

  async createFamilyMember(input: NewFamilyMember): Promise<FamilyMember> {
    const member: FamilyMember = { ...input, id: newId('mem'), createdAt: this.nowISO() };
    this.db.familyMembers = [...this.db.familyMembers, member];
    await this.flush();
    return member;
  }

  async updateFamilyMember(id: ID, patch: Partial<NewFamilyMember>): Promise<FamilyMember> {
    const index = this.db.familyMembers.findIndex((m) => m.id === id);
    if (index < 0) throw new Error(`Family member ${id} not found`);
    const updated = { ...this.db.familyMembers[index], ...patch };
    this.db.familyMembers = this.db.familyMembers.map((m, i) => (i === index ? updated : m));
    await this.flush();
    return updated;
  }

  async deleteFamilyMember(id: ID): Promise<void> {
    this.db.familyMembers = this.db.familyMembers.filter((m) => m.id !== id);
    await this.flush();
  }

  // --------------------------------------------------------- person events

  async listPersonEvents(): Promise<PersonEvent[]> {
    await delay();
    return [...this.db.personEvents];
  }

  async createPersonEvent(input: NewPersonEvent): Promise<PersonEvent> {
    const event: PersonEvent = { ...input, id: newId('pev'), createdAt: this.nowISO() };
    this.db.personEvents = [...this.db.personEvents, event];
    await this.flush();
    return event;
  }

  async updatePersonEvent(id: ID, patch: Partial<NewPersonEvent>): Promise<PersonEvent> {
    const index = this.db.personEvents.findIndex((e) => e.id === id);
    if (index < 0) throw new Error(`Person event ${id} not found`);
    const updated = { ...this.db.personEvents[index], ...patch };
    this.db.personEvents = this.db.personEvents.map((e, i) => (i === index ? updated : e));
    await this.flush();
    return updated;
  }

  async deletePersonEvent(id: ID): Promise<void> {
    this.db.personEvents = this.db.personEvents.filter((e) => e.id !== id);
    await this.flush();
  }

  // ------------------------------------------------------ profile/settings

  async getProfile(): Promise<UserProfile> {
    await delay();
    return { ...this.db.profile };
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    this.db.profile = { ...this.db.profile, ...patch };
    await this.flush();
    return { ...this.db.profile };
  }

  async getSettings(): Promise<AppSettings> {
    await delay();
    return { ...this.db.settings };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.db.settings = { ...this.db.settings, ...patch };
    await this.flush();
    return { ...this.db.settings };
  }

  // ------------------------------------------------------- backup/restore

  async exportAll(): Promise<BackupPayload> {
    await delay();
    return JSON.parse(JSON.stringify({ ...this.db, exportedAt: this.nowISO() }));
  }

  async importAll(payload: BackupPayload): Promise<void> {
    if (payload?.version !== 1) throw new Error('Unsupported backup version');
    this.db = migrate(JSON.parse(JSON.stringify(payload)));
    await this.flush();
  }

  async resetToSeed(): Promise<void> {
    this.db = buildSeed();
    await this.flush();
  }
}
