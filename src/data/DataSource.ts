import type {
  AppSettings,
  Dataset,
  Expense,
  Family,
  FamilyMember,
  FunctionEvent,
  ID,
  MoiEntry,
  Person,
  PersonEvent,
  UserProfile,
} from '../domain/models';

/**
 * Everything the app needs from persistence, expressed as one async port.
 *
 * The UI never talks to a data source directly — it goes through the
 * repositories in `src/data/repositories`, which in turn hold a `DataSource`.
 * Swapping the in-memory mock for SQLite or a REST backend therefore means
 * writing one new implementation of this interface and changing a single line
 * in `src/data/index.ts`; no screen changes at all.
 *
 * Every method is async even in the mock so that call sites are already written
 * for real latency.
 */

/** Fields the caller supplies on create; ids and timestamps are assigned. */
export type NewPerson = Omit<Person, 'id' | 'createdAt'>;
export type NewFamily = Omit<Family, 'id' | 'createdAt'>;
export type NewFunction = Omit<FunctionEvent, 'id' | 'createdAt'>;
export type NewMoiEntry = Omit<MoiEntry, 'id' | 'recordedAt'> & { recordedAt?: string };
export type NewPersonEvent = Omit<PersonEvent, 'id' | 'createdAt'>;
export type NewExpense = Omit<Expense, 'id' | 'createdAt'>;
export type NewFamilyMember = Omit<FamilyMember, 'id' | 'createdAt'>;

export interface DataSource {
  /** Called once at startup. Implementations may hydrate from disk here. */
  init(): Promise<void>;

  // People
  listPeople(): Promise<Person[]>;
  getPerson(id: ID): Promise<Person | undefined>;
  createPerson(input: NewPerson): Promise<Person>;
  updatePerson(id: ID, patch: Partial<NewPerson>): Promise<Person>;
  deletePerson(id: ID): Promise<void>;

  // Families
  listFamilies(): Promise<Family[]>;
  createFamily(input: NewFamily): Promise<Family>;
  updateFamily(id: ID, patch: Partial<NewFamily>): Promise<Family>;
  deleteFamily(id: ID): Promise<void>;

  // Functions hosted by the household
  listFunctions(): Promise<FunctionEvent[]>;
  getFunction(id: ID): Promise<FunctionEvent | undefined>;
  createFunction(input: NewFunction): Promise<FunctionEvent>;
  updateFunction(id: ID, patch: Partial<NewFunction>): Promise<FunctionEvent>;
  deleteFunction(id: ID): Promise<void>;

  // Moi entries
  listMoiEntries(): Promise<MoiEntry[]>;
  createMoiEntry(input: NewMoiEntry): Promise<MoiEntry>;
  updateMoiEntry(id: ID, patch: Partial<NewMoiEntry>): Promise<MoiEntry>;
  deleteMoiEntry(id: ID): Promise<void>;

  // Expenses (always scoped to a function)
  listExpenses(): Promise<Expense[]>;
  createExpense(input: NewExpense): Promise<Expense>;
  updateExpense(id: ID, patch: Partial<NewExpense>): Promise<Expense>;
  deleteExpense(id: ID): Promise<void>;

  // Family collaboration
  listFamilyMembers(): Promise<FamilyMember[]>;
  createFamilyMember(input: NewFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: ID, patch: Partial<NewFamilyMember>): Promise<FamilyMember>;
  deleteFamilyMember(id: ID): Promise<void>;

  // Functions hosted by other people (drives the return-moi report)
  listPersonEvents(): Promise<PersonEvent[]>;
  createPersonEvent(input: NewPersonEvent): Promise<PersonEvent>;
  updatePersonEvent(id: ID, patch: Partial<NewPersonEvent>): Promise<PersonEvent>;
  deletePersonEvent(id: ID): Promise<void>;

  // Profile & settings
  getProfile(): Promise<UserProfile>;
  updateProfile(patch: Partial<UserProfile>): Promise<UserProfile>;
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;

  /** Serialise everything — used by Backup & Restore. */
  exportAll(): Promise<BackupPayload>;
  /** Replace everything from a backup. */
  importAll(payload: BackupPayload): Promise<void>;
  /** Wipe user data and re-seed the demo content. */
  resetToSeed(): Promise<void>;
}

export interface BackupPayload extends Dataset {
  version: 1;
  exportedAt: string;
}
