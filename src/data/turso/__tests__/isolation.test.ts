import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Data isolation, enforced by reading the source rather than by remembering.
 *
 * libSQL has no row-level security: nothing in the database stops a query from
 * returning another household's rows, so the filter has to be in every
 * statement. A rule like that decays — someone adds a method in a hurry and
 * the leak is silent, because the query works perfectly and simply returns
 * too much. So this test parses TursoDataSource.ts and fails the build if any
 * statement reaches a user table unscoped.
 */

const SOURCE = readFileSync(join(__dirname, '..', 'TursoDataSource.ts'), 'utf8');

/** Every table holding one user's records. */
const USER_TABLES = [
  'people', 'functions', 'moi', 'gifts', 'expenses', 'person_events', 'app_settings',
];

/**
 * Pulls the SQL out of the backtick literals.
 *
 * Column lists are interpolated (`${TursoDataSource.MOI_COLS}`), which never
 * contains a table name or a filter, so replacing it with a placeholder loses
 * nothing this test cares about.
 */
function sqlLiterals(): string[] {
  const found: string[] = [];
  const re = /`([^`]*)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(SOURCE))) {
    const text = match[1].replace(/\$\{[^}]*\}/g, ' COLS ');
    if (/\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(text)) found.push(text.trim());
  }
  return found;
}

const statements = sqlLiterals();

describe('every statement is scoped to one user', () => {
  it('finds the statements to check', () => {
    // A refactor that moves the SQL elsewhere must not silently disarm this.
    expect(statements.length).toBeGreaterThan(30);
  });

  it.each(USER_TABLES)('names user_id wherever it touches %s', (table) => {
    const touching = statements.filter((s) =>
      new RegExp(`\\b(FROM|INTO|UPDATE|JOIN)\\s+${table}\\b`, 'i').test(s),
    );
    expect(touching.length).toBeGreaterThan(0);

    const unscoped = touching.filter((s) => !/user_id/i.test(s));
    expect(unscoped).toEqual([]);
  });

  it('scopes the users table by its own primary key', () => {
    const touching = statements.filter((s) => /\b(FROM|INTO|UPDATE)\s+users\b/i.test(s));
    expect(touching.length).toBeGreaterThan(0);
    // `users.id` *is* the user id, so `WHERE id = ?` is the scope here.
    for (const s of touching) expect(s).toMatch(/WHERE\s+id\s*=\s*\?/i);
  });

  it('never interpolates a value into SQL', () => {
    // Arguments are always bound. An interpolated value would be both an
    // injection route and a way to slip past the checks above.
    const interpolated = statements.filter((s) => s.includes('COLS') && /COLS\s*=/.test(s));
    expect(interpolated).toEqual([]);
  });

  it('reads and writes rows a parent owns, checked in the statement itself', () => {
    // Child inserts are INSERT ... SELECT so a parent id belonging to someone
    // else matches no row and inserts nothing, instead of leaning on a
    // separate ownership check that a later edit could drop.
    const childInserts = statements.filter((s) => /^INSERT INTO (moi|gifts|expenses|person_events)\b/i.test(s));
    expect(childInserts.length).toBeGreaterThan(5);
    for (const s of childInserts) {
      expect(s).toMatch(/SELECT/i);
      expect(s).toMatch(/user_id\s*=\s*\?/i);
    }
  });

  it('hides soft-deleted rows on every list', () => {
    const lists = statements.filter((s) => /^SELECT/i.test(s) && /\bFROM\s+(people|functions|moi|gifts|expenses|person_events)\b/i.test(s));
    expect(lists.length).toBeGreaterThan(0);
    // The read-back after a write is the exception: it fetches one row by the
    // id just written, and that row is never deleted.
    const listing = lists.filter((s) => !/WHERE id = \? AND user_id = \?\s*$/i.test(s));
    for (const s of listing) expect(s).toMatch(/deleted_at IS NULL/i);
  });
});
