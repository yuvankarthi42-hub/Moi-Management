import type {
  AppSettings, Expense, Family, FamilyMember, FunctionEvent, GiftEntry, GiftGiven, ID,
  MoiEntry, MoiGiven, Person, PersonEvent, UserProfile,
} from '../../domain/models';
import type {
  BackupPayload, DataSource, NewExpense, NewFamily, NewFamilyMember, NewFunction,
  NewGift, NewGiftGiven, NewMoiEntry, NewMoiGiven, NewPerson, NewPersonEvent,
} from '../DataSource';
import { NotFoundError, ValidationError } from '../repositories/errors';
import * as map from './rows';
import { flag, nul } from './rows';
import type { SqlClient, SqlRow, Statement } from './SqlClient';

/** Who the queries are for. Supplied by the auth layer, never by a screen. */
export interface UserScope {
  currentUserId(): string | undefined;
  /** Throws rather than returning undefined: a query with no user is a bug. */
  requireUserId(): string;
}

/** Sortable and collision-resistant enough for records written on two devices. */
function newId(prefix: string): ID {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}${rand}`;
}

const nowISO = (): string => new Date().toISOString();

/**
 * Reads and writes the household's records in Turso.
 *
 * Every statement in this file names `user_id`. That is not a convention to
 * remember — it is checked: `TursoDataSource.isolation.test.ts` parses this
 * source and fails if any SQL string reaches a user table without it.
 *
 * For rows that hang off a parent (moi and gifts at one of our functions,
 * expenses, a person's own event) the insert is written as
 * `INSERT ... SELECT ... WHERE parent.user_id = ?`, so a request naming
 * somebody else's function id inserts nothing at all rather than relying on a
 * separate check that a later edit could drop.
 */
export class TursoDataSource implements DataSource {
  constructor(
    private readonly sql: SqlClient,
    private readonly scope: UserScope,
  ) {}

  async init(): Promise<void> {
    // Nothing to hydrate: every read goes to the database. The read-through
    // cache that makes the app viewable offline lives a layer above, in
    // `src/store/DatasetCache.ts`.
  }

  private get me(): string {
    return this.scope.requireUserId();
  }

  private async rows(sql: string, args: (string | number | null)[] = []): Promise<SqlRow[]> {
    return this.sql.query({ sql, args });
  }

  private async one(sql: string, args: (string | number | null)[] = []): Promise<SqlRow | undefined> {
    const rows = await this.rows(sql, args);
    return rows[0];
  }

  /**
   * Runs a write and reads the row back, so callers get what the database
   * actually stored rather than what they hoped it would.
   */
  private async writeThenRead<T>(
    statements: Statement[],
    readSql: string,
    readArgs: (string | number | null)[],
    to: (row: SqlRow) => T,
    what: string,
  ): Promise<T> {
    await this.sql.transaction(statements);
    const row = await this.one(readSql, readArgs);
    // A missing row here means the insert matched no parent — which is what
    // happens when the id named belongs to another user.
    if (!row) throw new NotFoundError(what);
    return to(row);
  }

  // =========================================================================
  // People
  // =========================================================================

  private static readonly PERSON_COLS =
    'id, name, phone_country, phone, village, relation, photo_path, notes, created_at';

  async listPeople(): Promise<Person[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.PERSON_COLS} FROM people
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY name COLLATE NOCASE`,
      [this.me],
    );
    return rows.map(map.toPerson);
  }

  async getPerson(id: ID): Promise<Person | undefined> {
    const row = await this.one(
      `SELECT ${TursoDataSource.PERSON_COLS} FROM people
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, this.me],
    );
    return row ? map.toPerson(row) : undefined;
  }

  async createPerson(input: NewPerson): Promise<Person> {
    const id = newId('per');
    const at = nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO people
                (id, user_id, name, phone_country, phone, village, relation, photo_path, notes,
                 created_at, updated_at, created_by)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id, this.me, input.name, nul(input.countryCode), nul(input.phone), nul(input.village),
          nul(input.relation), nul(input.photoUri), nul(input.notes), at, at, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.PERSON_COLS} FROM people WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toPerson,
      'Person',
    );
  }

  async updatePerson(id: ID, patch: Partial<NewPerson>): Promise<Person> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('name' in patch) put('name', patch.name ?? '');
    if ('countryCode' in patch) put('phone_country', nul(patch.countryCode));
    if ('phone' in patch) put('phone', nul(patch.phone));
    if ('village' in patch) put('village', nul(patch.village));
    if ('relation' in patch) put('relation', nul(patch.relation));
    if ('photoUri' in patch) put('photo_path', nul(patch.photoUri));
    if ('notes' in patch) put('notes', nul(patch.notes));
    put('updated_at', nowISO());

    return this.writeThenRead(
      [{
        sql: `UPDATE people SET ${sets.join(', ')}
               WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [...args, id, this.me],
      }],
      `SELECT ${TursoDataSource.PERSON_COLS} FROM people WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toPerson,
      'Person',
    );
  }

  /**
   * Soft-deletes the person and everything of theirs, in one transaction.
   *
   * `ON DELETE CASCADE` fires only on a real DELETE, so stamping the parent
   * alone would leave their moi live and still counted in every total.
   */
  async deletePerson(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([
      { sql: `UPDATE moi SET deleted_at = ?, updated_at = ?
               WHERE person_id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [at, at, id, this.me] },
      { sql: `UPDATE gifts SET deleted_at = ?, updated_at = ?
               WHERE person_id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [at, at, id, this.me] },
      { sql: `UPDATE person_events SET deleted_at = ?, updated_at = ?
               WHERE person_id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [at, at, id, this.me] },
      { sql: `UPDATE people SET deleted_at = ?, updated_at = ?
               WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [at, at, id, this.me] },
    ]);
  }

  // =========================================================================
  // Functions we host
  // =========================================================================

  private static readonly FUNCTION_COLS =
    'id, title, type, date, time, venue, village, host, notes, cover_path, photo_paths, created_at';

  async listFunctions(): Promise<FunctionEvent[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.FUNCTION_COLS} FROM functions
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY date DESC`,
      [this.me],
    );
    return rows.map(map.toFunction);
  }

  async getFunction(id: ID): Promise<FunctionEvent | undefined> {
    const row = await this.one(
      `SELECT ${TursoDataSource.FUNCTION_COLS} FROM functions
        WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [id, this.me],
    );
    return row ? map.toFunction(row) : undefined;
  }

  async createFunction(input: NewFunction): Promise<FunctionEvent> {
    const id = newId('fn');
    const at = nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO functions
                (id, user_id, title, type, date, time, venue, village, host, notes,
                 cover_path, photo_paths, created_at, updated_at, created_by)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          id, this.me, input.title, input.type, input.date, nul(input.time),
          nul(input.venue), nul(input.village), nul(input.host), nul(input.notes),
          nul(input.coverImage), JSON.stringify(input.photos ?? []), at, at, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.FUNCTION_COLS} FROM functions WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toFunction,
      'Function',
    );
  }

  async updateFunction(id: ID, patch: Partial<NewFunction>): Promise<FunctionEvent> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('title' in patch) put('title', patch.title ?? '');
    if ('type' in patch) put('type', patch.type ?? 'other');
    if ('date' in patch) put('date', patch.date ?? '');
    if ('time' in patch) put('time', nul(patch.time));
    if ('venue' in patch) put('venue', nul(patch.venue));
    if ('village' in patch) put('village', nul(patch.village));
    if ('host' in patch) put('host', nul(patch.host));
    if ('notes' in patch) put('notes', nul(patch.notes));
    if ('coverImage' in patch) put('cover_path', nul(patch.coverImage));
    if ('photos' in patch) put('photo_paths', JSON.stringify(patch.photos ?? []));
    put('updated_at', nowISO());

    // A function's date is what its received moi and gifts are dated by, so a
    // date change has to carry through to them or the timelines drift apart.
    const statements: Statement[] = [{
      sql: `UPDATE functions SET ${sets.join(', ')}
             WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      args: [...args, id, this.me],
    }];
    if ('date' in patch && patch.date) {
      for (const table of ['moi', 'gifts']) {
        statements.push({
          sql: `UPDATE ${table} SET entry_date = ?, updated_at = ?
                 WHERE function_id = ? AND user_id = ? AND deleted_at IS NULL`,
          args: [patch.date, nowISO(), id, this.me],
        });
      }
    }

    return this.writeThenRead(
      statements,
      `SELECT ${TursoDataSource.FUNCTION_COLS} FROM functions WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toFunction,
      'Function',
    );
  }

  /** Soft-deletes the function together with its moi, gifts and expenses. */
  async deleteFunction(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([
      ...['moi', 'gifts', 'expenses'].map((table) => ({
        sql: `UPDATE ${table} SET deleted_at = ?, updated_at = ?
               WHERE function_id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [at, at, id, this.me],
      })),
      { sql: `UPDATE functions SET deleted_at = ?, updated_at = ?
               WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [at, at, id, this.me] },
    ]);
  }

  // =========================================================================
  // Moi — one table, both directions
  // =========================================================================

  private static readonly MOI_COLS =
    'id, person_id, function_id, person_event_id, occasion, amount, payment_type,' +
    ' entry_date, notes, photo_path, created_at';

  async listMoiEntries(): Promise<MoiEntry[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.MOI_COLS} FROM moi
        WHERE user_id = ? AND direction = 'received' AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [this.me],
    );
    return rows.map(map.toMoiEntry);
  }

  /**
   * Records cash received at one of our functions.
   *
   * Written as INSERT ... SELECT so the function and the person must both
   * already belong to the caller. Naming somebody else's id inserts nothing,
   * and the read-back below then raises NotFound.
   */
  async createMoiEntry(input: NewMoiEntry): Promise<MoiEntry> {
    const id = newId('moi');
    const at = input.recordedAt ?? nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO moi
                (id, user_id, direction, person_id, function_id, amount, payment_type,
                 entry_date, notes, photo_path, created_at, updated_at, created_by)
              SELECT ?, ?, 'received', p.id, f.id, ?, ?, f.date, ?, ?, ?, ?, ?
                FROM functions f, people p
               WHERE f.id = ? AND f.user_id = ? AND f.deleted_at IS NULL
                 AND p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL`,
        args: [
          id, this.me, input.amount, input.paymentType, nul(input.notes),
          nul(input.photoUri), at, at, this.me,
          input.functionId, this.me, input.personId, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.MOI_COLS} FROM moi WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toMoiEntry,
      'Function or person',
    );
  }

  async updateMoiEntry(id: ID, patch: Partial<NewMoiEntry>): Promise<MoiEntry> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('amount' in patch) put('amount', patch.amount ?? 0);
    if ('paymentType' in patch) put('payment_type', patch.paymentType ?? 'cash');
    if ('notes' in patch) put('notes', nul(patch.notes));
    if ('photoUri' in patch) put('photo_path', nul(patch.photoUri));
    if ('personId' in patch) put('person_id', patch.personId ?? '');
    put('updated_at', nowISO());

    return this.writeThenRead(
      [{
        sql: `UPDATE moi SET ${sets.join(', ')}
               WHERE id = ? AND user_id = ? AND direction = 'received'
                 AND deleted_at IS NULL`,
        args: [...args, id, this.me],
      }],
      `SELECT ${TursoDataSource.MOI_COLS} FROM moi WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toMoiEntry,
      'Moi entry',
    );
  }

  async deleteMoiEntry(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([{
      sql: `UPDATE moi SET deleted_at = ?, updated_at = ?
             WHERE id = ? AND user_id = ? AND direction = 'received'`,
      args: [at, at, id, this.me],
    }]);
  }

  async listMoiGiven(): Promise<MoiGiven[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.MOI_COLS} FROM moi
        WHERE user_id = ? AND direction = 'given' AND deleted_at IS NULL
        ORDER BY entry_date DESC`,
      [this.me],
    );
    return rows.map(map.toMoiGiven);
  }

  async createMoiGiven(input: NewMoiGiven): Promise<MoiGiven> {
    const id = newId('mgv');
    const at = nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO moi
                (id, user_id, direction, person_id, person_event_id, occasion, amount,
                 payment_type, entry_date, notes, photo_path, created_at, updated_at, created_by)
              SELECT ?, ?, 'given', p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM people p
               WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL`,
        args: [
          id, this.me, nul(input.personEventId), nul(input.occasion), input.amount,
          input.paymentType, input.date, nul(input.notes), nul(input.photoUri),
          at, at, this.me, input.personId, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.MOI_COLS} FROM moi WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toMoiGiven,
      'Person',
    );
  }

  async updateMoiGiven(id: ID, patch: Partial<NewMoiGiven>): Promise<MoiGiven> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('amount' in patch) put('amount', patch.amount ?? 0);
    if ('paymentType' in patch) put('payment_type', patch.paymentType ?? 'cash');
    if ('date' in patch) put('entry_date', patch.date ?? '');
    if ('occasion' in patch) put('occasion', nul(patch.occasion));
    if ('personEventId' in patch) put('person_event_id', nul(patch.personEventId));
    if ('notes' in patch) put('notes', nul(patch.notes));
    if ('photoUri' in patch) put('photo_path', nul(patch.photoUri));
    put('updated_at', nowISO());

    return this.writeThenRead(
      [{
        sql: `UPDATE moi SET ${sets.join(', ')}
               WHERE id = ? AND user_id = ? AND direction = 'given' AND deleted_at IS NULL`,
        args: [...args, id, this.me],
      }],
      `SELECT ${TursoDataSource.MOI_COLS} FROM moi WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toMoiGiven,
      'Moi given',
    );
  }

  async deleteMoiGiven(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([{
      sql: `UPDATE moi SET deleted_at = ?, updated_at = ?
             WHERE id = ? AND user_id = ? AND direction = 'given'`,
      args: [at, at, id, this.me],
    }]);
  }

  // =========================================================================
  // Gifts — one table, both directions
  // =========================================================================

  private static readonly GIFT_COLS =
    'id, person_id, function_id, person_event_id, occasion, name, value,' +
    ' entry_date, notes, photo_path, created_at';

  async listGifts(): Promise<GiftEntry[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.GIFT_COLS} FROM gifts
        WHERE user_id = ? AND direction = 'received' AND deleted_at IS NULL
        ORDER BY created_at DESC`,
      [this.me],
    );
    return rows.map(map.toGift);
  }

  async createGift(input: NewGift): Promise<GiftEntry> {
    const id = newId('gft');
    const at = input.recordedAt ?? nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO gifts
                (id, user_id, direction, person_id, function_id, name, value,
                 entry_date, notes, photo_path, created_at, updated_at, created_by)
              SELECT ?, ?, 'received', p.id, f.id, ?, ?, f.date, ?, ?, ?, ?, ?
                FROM functions f, people p
               WHERE f.id = ? AND f.user_id = ? AND f.deleted_at IS NULL
                 AND p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL`,
        args: [
          id, this.me, input.name,
          // NULL, not 0: a gift nobody priced is not a gift worth nothing.
          input.value ?? null,
          nul(input.notes), nul(input.photoUri), at, at, this.me,
          input.functionId, this.me, input.personId, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.GIFT_COLS} FROM gifts WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toGift,
      'Function or person',
    );
  }

  async updateGift(id: ID, patch: Partial<NewGift>): Promise<GiftEntry> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('name' in patch) put('name', patch.name ?? '');
    if ('value' in patch) put('value', patch.value ?? null);
    if ('notes' in patch) put('notes', nul(patch.notes));
    if ('photoUri' in patch) put('photo_path', nul(patch.photoUri));
    if ('personId' in patch) put('person_id', patch.personId ?? '');
    put('updated_at', nowISO());

    return this.writeThenRead(
      [{
        sql: `UPDATE gifts SET ${sets.join(', ')}
               WHERE id = ? AND user_id = ? AND direction = 'received' AND deleted_at IS NULL`,
        args: [...args, id, this.me],
      }],
      `SELECT ${TursoDataSource.GIFT_COLS} FROM gifts WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toGift,
      'Gift',
    );
  }

  async deleteGift(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([{
      sql: `UPDATE gifts SET deleted_at = ?, updated_at = ?
             WHERE id = ? AND user_id = ? AND direction = 'received'`,
      args: [at, at, id, this.me],
    }]);
  }

  async listGiftsGiven(): Promise<GiftGiven[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.GIFT_COLS} FROM gifts
        WHERE user_id = ? AND direction = 'given' AND deleted_at IS NULL
        ORDER BY entry_date DESC`,
      [this.me],
    );
    return rows.map(map.toGiftGiven);
  }

  async createGiftGiven(input: NewGiftGiven): Promise<GiftGiven> {
    const id = newId('ggv');
    const at = nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO gifts
                (id, user_id, direction, person_id, person_event_id, occasion, name,
                 value, entry_date, notes, photo_path, created_at, updated_at, created_by)
              SELECT ?, ?, 'given', p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM people p
               WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL`,
        args: [
          id, this.me, nul(input.personEventId), nul(input.occasion), input.name,
          input.value ?? null, input.date, nul(input.notes), nul(input.photoUri),
          at, at, this.me, input.personId, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.GIFT_COLS} FROM gifts WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toGiftGiven,
      'Person',
    );
  }

  async updateGiftGiven(id: ID, patch: Partial<NewGiftGiven>): Promise<GiftGiven> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('name' in patch) put('name', patch.name ?? '');
    if ('value' in patch) put('value', patch.value ?? null);
    if ('date' in patch) put('entry_date', patch.date ?? '');
    if ('occasion' in patch) put('occasion', nul(patch.occasion));
    if ('personEventId' in patch) put('person_event_id', nul(patch.personEventId));
    if ('notes' in patch) put('notes', nul(patch.notes));
    if ('photoUri' in patch) put('photo_path', nul(patch.photoUri));
    put('updated_at', nowISO());

    return this.writeThenRead(
      [{
        sql: `UPDATE gifts SET ${sets.join(', ')}
               WHERE id = ? AND user_id = ? AND direction = 'given' AND deleted_at IS NULL`,
        args: [...args, id, this.me],
      }],
      `SELECT ${TursoDataSource.GIFT_COLS} FROM gifts WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toGiftGiven,
      'Gift given',
    );
  }

  async deleteGiftGiven(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([{
      sql: `UPDATE gifts SET deleted_at = ?, updated_at = ?
             WHERE id = ? AND user_id = ? AND direction = 'given'`,
      args: [at, at, id, this.me],
    }]);
  }

  // =========================================================================
  // Expenses
  // =========================================================================

  private static readonly EXPENSE_COLS =
    'id, function_id, category, amount, payment_type, paid_by, date, notes,' +
    ' receipt_path, created_at';

  async listExpenses(): Promise<Expense[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.EXPENSE_COLS} FROM expenses
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY date DESC`,
      [this.me],
    );
    return rows.map(map.toExpense);
  }

  async createExpense(input: NewExpense): Promise<Expense> {
    const id = newId('exp');
    const at = nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO expenses
                (id, user_id, function_id, category, amount, payment_type, paid_by,
                 date, notes, receipt_path, created_at, updated_at, created_by)
              SELECT ?, ?, f.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM functions f
               WHERE f.id = ? AND f.user_id = ? AND f.deleted_at IS NULL`,
        args: [
          id, this.me, input.category, input.amount, input.paymentType,
          nul(input.paidBy), input.date, nul(input.notes), nul(input.receiptPhoto),
          at, at, this.me, input.functionId, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.EXPENSE_COLS} FROM expenses WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toExpense,
      'Function',
    );
  }

  async updateExpense(id: ID, patch: Partial<NewExpense>): Promise<Expense> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('category' in patch) put('category', patch.category ?? 'other');
    if ('amount' in patch) put('amount', patch.amount ?? 0);
    if ('paymentType' in patch) put('payment_type', patch.paymentType ?? 'cash');
    if ('paidBy' in patch) put('paid_by', nul(patch.paidBy));
    if ('date' in patch) put('date', patch.date ?? '');
    if ('notes' in patch) put('notes', nul(patch.notes));
    if ('receiptPhoto' in patch) put('receipt_path', nul(patch.receiptPhoto));
    put('updated_at', nowISO());

    return this.writeThenRead(
      [{
        sql: `UPDATE expenses SET ${sets.join(', ')}
               WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [...args, id, this.me],
      }],
      `SELECT ${TursoDataSource.EXPENSE_COLS} FROM expenses WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toExpense,
      'Expense',
    );
  }

  async deleteExpense(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([{
      sql: `UPDATE expenses SET deleted_at = ?, updated_at = ?
             WHERE id = ? AND user_id = ?`,
      args: [at, at, id, this.me],
    }]);
  }

  // =========================================================================
  // Their functions
  // =========================================================================

  private static readonly PEVENT_COLS = 'id, person_id, title, type, date, village, created_at';

  async listPersonEvents(): Promise<PersonEvent[]> {
    const rows = await this.rows(
      `SELECT ${TursoDataSource.PEVENT_COLS} FROM person_events
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY date`,
      [this.me],
    );
    return rows.map(map.toPersonEvent);
  }

  async createPersonEvent(input: NewPersonEvent): Promise<PersonEvent> {
    const id = newId('pev');
    const at = nowISO();
    return this.writeThenRead(
      [{
        sql: `INSERT INTO person_events
                (id, user_id, person_id, title, type, date, village,
                 created_at, updated_at, created_by)
              SELECT ?, ?, p.id, ?, ?, ?, ?, ?, ?, ?
                FROM people p
               WHERE p.id = ? AND p.user_id = ? AND p.deleted_at IS NULL`,
        args: [
          id, this.me, input.title, input.type, input.date, nul(input.village),
          at, at, this.me, input.personId, this.me,
        ],
      }],
      `SELECT ${TursoDataSource.PEVENT_COLS} FROM person_events WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toPersonEvent,
      'Person',
    );
  }

  async updatePersonEvent(id: ID, patch: Partial<NewPersonEvent>): Promise<PersonEvent> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('title' in patch) put('title', patch.title ?? '');
    if ('type' in patch) put('type', patch.type ?? 'other');
    if ('date' in patch) put('date', patch.date ?? '');
    if ('village' in patch) put('village', nul(patch.village));
    put('updated_at', nowISO());

    return this.writeThenRead(
      [{
        sql: `UPDATE person_events SET ${sets.join(', ')}
               WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
        args: [...args, id, this.me],
      }],
      `SELECT ${TursoDataSource.PEVENT_COLS} FROM person_events WHERE id = ? AND user_id = ?`,
      [id, this.me],
      map.toPersonEvent,
      'Their function',
    );
  }

  /**
   * Soft-deletes their event and unlinks what we gave towards it.
   *
   * The moi itself is kept: we did give that money. Only the link goes, and
   * the occasion is left as text so the record still reads sensibly.
   */
  async deletePersonEvent(id: ID): Promise<void> {
    const at = nowISO();
    await this.sql.transaction([
      ...['moi', 'gifts'].map((table) => ({
        sql: `UPDATE ${table} SET person_event_id = NULL, updated_at = ?
               WHERE person_event_id = ? AND user_id = ?`,
        args: [at, id, this.me],
      })),
      { sql: `UPDATE person_events SET deleted_at = ?, updated_at = ?
               WHERE id = ? AND user_id = ?`,
        args: [at, at, id, this.me] },
    ]);
  }

  // =========================================================================
  // Family grouping and collaboration
  //
  // Neither has a table. `families` went with the Family Group feature when it
  // was removed from the UI, and per-member roles are superseded by
  // `function_shares` — per-function sharing, which is created but dormant
  // (see docs/DATABASE.md). These return nothing rather than throwing so the
  // selectors that still read `Dataset.families` keep working.
  // =========================================================================

  async listFamilies(): Promise<Family[]> {
    return [];
  }

  async createFamily(): Promise<Family> {
    throw new ValidationError('Family groups are no longer part of the app.');
  }

  async updateFamily(): Promise<Family> {
    throw new ValidationError('Family groups are no longer part of the app.');
  }

  async deleteFamily(): Promise<void> {
    // Nothing to delete.
  }

  async listFamilyMembers(): Promise<FamilyMember[]> {
    return [];
  }

  async createFamilyMember(): Promise<FamilyMember> {
    throw new ValidationError('Sharing is not available yet.');
  }

  async updateFamilyMember(): Promise<FamilyMember> {
    throw new ValidationError('Sharing is not available yet.');
  }

  async deleteFamilyMember(): Promise<void> {
    // Nothing to delete.
  }

  // =========================================================================
  // Profile and settings
  // =========================================================================

  async getProfile(): Promise<UserProfile> {
    const row = await this.one(
      `SELECT id, display_name, email, village, photo_url, phone_country, phone
         FROM users WHERE id = ?`,
      [this.me],
    );
    if (!row) throw new NotFoundError('Profile');
    return map.toProfile(row);
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('name' in patch) put('display_name', nul(patch.name));
    if ('village' in patch) put('village', nul(patch.village));
    if ('photoUri' in patch) put('photo_url', nul(patch.photoUri));
    if ('phone' in patch) {
      // Arrives as one string; stored split so a dialling code can be matched.
      const digits = (patch.phone ?? '').replace(/[^\d+]/g, '');
      const match = /^(\+\d{1,4})(\d{4,})$/.exec(digits);
      put('phone_country', match ? match[1] : null);
      put('phone', match ? match[2] : nul(digits.replace(/\D/g, '')));
    }
    // Email is Google's, not ours to edit.
    put('updated_at', nowISO());

    await this.sql.transaction([{
      sql: `UPDATE users SET ${sets.join(', ')} WHERE id = ?`,
      args: [...args, this.me],
    }]);
    return this.getProfile();
  }

  async getSettings(): Promise<AppSettings> {
    const row = await this.one(
      `SELECT theme, language, hide_amounts_home, suggestion_rounding, auspicious_rupee,
              notify_upcoming, notify_tomorrow, notify_return_moi, notify_backup
         FROM app_settings WHERE user_id = ?`,
      [this.me],
    );
    // A missing row reads as NULL, not as the column defaults, so create it
    // rather than handing the app a half-empty settings object.
    if (!row) {
      await this.sql.transaction([{
        sql: `INSERT INTO app_settings (user_id, updated_at) VALUES (?, ?)`,
        args: [this.me, nowISO()],
      }]);
      return this.getSettings();
    }
    return map.toSettings(row);
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    await this.getSettings(); // ensures the row exists before updating it
    const sets: string[] = [];
    const args: (string | number | null)[] = [];
    const put = (column: string, value: string | number | null) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };
    if ('theme' in patch) put('theme', patch.theme ?? 'system');
    if ('language' in patch) put('language', patch.language ?? 'en');
    if ('hideAmountsOnHome' in patch) put('hide_amounts_home', flag(patch.hideAmountsOnHome));
    if ('suggestionRounding' in patch) put('suggestion_rounding', patch.suggestionRounding ?? 100);
    if ('auspiciousRupee' in patch) put('auspicious_rupee', flag(patch.auspiciousRupee));
    if (patch.notifications) {
      const n = patch.notifications;
      if ('upcomingFunction' in n) put('notify_upcoming', flag(n.upcomingFunction));
      if ('functionTomorrow' in n) put('notify_tomorrow', flag(n.functionTomorrow));
      if ('returnMoi' in n) put('notify_return_moi', flag(n.returnMoi));
      if ('backupReminder' in n) put('notify_backup', flag(n.backupReminder));
    }
    put('updated_at', nowISO());

    await this.sql.transaction([{
      sql: `UPDATE app_settings SET ${sets.join(', ')} WHERE user_id = ?`,
      args: [...args, this.me],
    }]);
    return this.getSettings();
  }

  // =========================================================================
  // Backup
  // =========================================================================

  async exportAll(): Promise<BackupPayload> {
    const [
      people, functions, moiEntries, moiGiven, gifts, giftsGiven, expenses,
      personEvents, profile, settings,
    ] = await Promise.all([
      this.listPeople(), this.listFunctions(), this.listMoiEntries(), this.listMoiGiven(),
      this.listGifts(), this.listGiftsGiven(), this.listExpenses(), this.listPersonEvents(),
      this.getProfile(), this.getSettings(),
    ]);
    return {
      version: 1,
      exportedAt: nowISO(),
      people, families: [], functions, moiEntries, moiGiven, gifts, giftsGiven,
      expenses, personEvents, familyMembers: [], profile, settings,
    };
  }

  /**
   * Replaces the signed-in user's records with a backup's.
   *
   * Ids from the payload are kept, or the links between records would not
   * survive the trip. Two things guard the write:
   *
   *  - the payload is checked first, so a file whose moi entry points at a
   *    function the file does not contain is refused with a useful message
   *    rather than a foreign-key error;
   *  - every child row is inserted with INSERT ... SELECT against its parent,
   *    the same as everywhere else, so a crafted file naming another user's
   *    person or function id inserts nothing at all.
   *
   * It is one transaction, so a failure part-way leaves the existing books
   * untouched rather than half-replaced.
   */
  async importAll(payload: BackupPayload): Promise<void> {
    const me = this.me;
    const at = nowISO();

    const peopleIds = new Set(payload.people.map((p) => p.id));
    const functionIds = new Set(payload.functions.map((f) => f.id));
    const eventIds = new Set(payload.personEvents.map((e) => e.id));
    const check = (what: string, personId?: string, functionId?: string) => {
      if (personId && !peopleIds.has(personId)) {
        throw new ValidationError(`This backup has a ${what} for a person it does not contain.`);
      }
      if (functionId && !functionIds.has(functionId)) {
        throw new ValidationError(`This backup has a ${what} for a function it does not contain.`);
      }
    };
    for (const m of payload.moiEntries) check('moi entry', m.personId, m.functionId);
    for (const g of payload.moiGiven) check('moi given', g.personId);
    for (const g of payload.gifts) check('gift', g.personId, g.functionId);
    for (const g of payload.giftsGiven) check('gift given', g.personId);
    for (const x of payload.expenses) check('expense', undefined, x.functionId);
    for (const e of payload.personEvents) check('function of theirs', e.personId);

    const statements: Statement[] = [
      // Ordered so children go before the parents they reference.
      { sql: `DELETE FROM moi WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM gifts WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM expenses WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM person_events WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM functions WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM people WHERE user_id = ?`, args: [me] },
    ];

    for (const p of payload.people) {
      statements.push({
        sql: `INSERT INTO people (id, user_id, name, phone_country, phone, village, relation,
                photo_path, notes, created_at, updated_at, created_by)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [p.id, me, p.name, nul(p.countryCode), nul(p.phone), nul(p.village), nul(p.relation),
               nul(p.photoUri), nul(p.notes), p.createdAt || at, at, me],
      });
    }
    for (const f of payload.functions) {
      statements.push({
        sql: `INSERT INTO functions (id, user_id, title, type, date, time, venue,
                village, host, notes, cover_path, photo_paths, created_at, updated_at, created_by)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [f.id, me, f.title, f.type, f.date, nul(f.time), nul(f.venue),
               nul(f.village), nul(f.host), nul(f.notes), nul(f.coverImage),
               JSON.stringify(f.photos ?? []), f.createdAt || at, at, me],
      });
    }
    for (const e of payload.personEvents) {
      statements.push({
        sql: `INSERT INTO person_events (id, user_id, person_id, title, type, date,
                village, created_at, updated_at, created_by)
              SELECT ?, ?, p.id, ?, ?, ?, ?, ?, ?, ?
                FROM people p WHERE p.id = ? AND p.user_id = ?`,
        args: [e.id, me, e.title, e.type, e.date, nul(e.village),
               e.createdAt || at, at, me, e.personId, me],
      });
    }

    const functionDate = new Map(payload.functions.map((f) => [f.id, f.date]));
    for (const m of payload.moiEntries) {
      statements.push({
        sql: `INSERT INTO moi (id, user_id, direction, person_id, function_id, amount,
                payment_type, entry_date, notes, photo_path, created_at, updated_at, created_by)
              SELECT ?, ?, 'received', p.id, f.id, ?, ?, f.date, ?, ?, ?, ?, ?
                FROM functions f, people p
               WHERE f.id = ? AND f.user_id = ? AND p.id = ? AND p.user_id = ?`,
        args: [m.id, me, m.amount, m.paymentType, nul(m.notes), nul(m.photoUri),
               m.recordedAt || at, at, me, m.functionId, me, m.personId, me],
      });
    }
    for (const g of payload.moiGiven) {
      statements.push({
        sql: `INSERT INTO moi (id, user_id, direction, person_id, person_event_id,
                occasion, amount, payment_type, entry_date, notes, photo_path,
                created_at, updated_at, created_by)
              SELECT ?, ?, 'given', p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM people p WHERE p.id = ? AND p.user_id = ?`,
        args: [g.id, me, eventIds.has(g.personEventId ?? '') ? g.personEventId! : null,
               nul(g.occasion), g.amount, g.paymentType, g.date, nul(g.notes),
               nul(g.photoUri), g.createdAt || at, at, me, g.personId, me],
      });
    }
    for (const g of payload.gifts) {
      statements.push({
        sql: `INSERT INTO gifts (id, user_id, direction, person_id, function_id, name,
                value, entry_date, notes, photo_path, created_at, updated_at, created_by)
              SELECT ?, ?, 'received', p.id, f.id, ?, ?, f.date, ?, ?, ?, ?, ?
                FROM functions f, people p
               WHERE f.id = ? AND f.user_id = ? AND p.id = ? AND p.user_id = ?`,
        args: [g.id, me, g.name, g.value ?? null, nul(g.notes), nul(g.photoUri),
               g.recordedAt || at, at, me, g.functionId, me, g.personId, me],
      });
    }
    for (const g of payload.giftsGiven) {
      statements.push({
        sql: `INSERT INTO gifts (id, user_id, direction, person_id, person_event_id,
                occasion, name, value, entry_date, notes, photo_path,
                created_at, updated_at, created_by)
              SELECT ?, ?, 'given', p.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM people p WHERE p.id = ? AND p.user_id = ?`,
        args: [g.id, me, eventIds.has(g.personEventId ?? '') ? g.personEventId! : null,
               nul(g.occasion), g.name, g.value ?? null, g.date, nul(g.notes),
               nul(g.photoUri), g.createdAt || at, at, me, g.personId, me],
      });
    }
    for (const x of payload.expenses) {
      statements.push({
        sql: `INSERT INTO expenses (id, user_id, function_id, category, amount,
                payment_type, paid_by, date, notes, receipt_path,
                created_at, updated_at, created_by)
              SELECT ?, ?, f.id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                FROM functions f WHERE f.id = ? AND f.user_id = ?`,
        args: [x.id, me, x.category, x.amount, x.paymentType, nul(x.paidBy), x.date,
               nul(x.notes), nul(x.receiptPhoto), x.createdAt || at, at, me, x.functionId, me],
      });
    }

    await this.sql.transaction(statements);
  }

  /**
   * Empties the signed-in user's books.
   *
   * There is no demo content to fall back to any more — the app talks to the
   * real database, so this is a wipe and nothing else. A hard delete is right
   * here: the user asked for the records to be gone, not hidden.
   */
  async resetToSeed(): Promise<void> {
    const me = this.me;
    await this.sql.transaction([
      { sql: `DELETE FROM moi WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM gifts WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM expenses WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM person_events WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM functions WHERE user_id = ?`, args: [me] },
      { sql: `DELETE FROM people WHERE user_id = ?`, args: [me] },
    ]);
  }
}
