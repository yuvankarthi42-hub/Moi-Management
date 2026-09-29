import { UserAccountStore } from '../UserAccountStore';
import type { SqlClient, Statement, SqlRow } from '../SqlClient';

/**
 * A fake `SqlClient` backed by a plain object, standing in for the one real
 * table this store touches. Simple enough to trust by inspection, so a bug in
 * the fake can't hide the bug this file exists to catch.
 */
class FakeUsers implements SqlClient {
  readonly online = true;
  private rows = new Map<string, Record<string, unknown>>();

  async query({ sql, args = [] }: Statement): Promise<SqlRow[]> {
    if (/^SELECT/i.test(sql)) {
      const row = this.rows.get(String(args[0]));
      return row ? [row as SqlRow] : [];
    }
    throw new Error(`FakeUsers cannot query: ${sql}`);
  }

  async transaction(statements: Statement[]): Promise<void> {
    for (const { sql, args = [] } of statements) {
      if (/^INSERT INTO users/i.test(sql)) {
        const [id, email, display_name, photo_url, created_at, updated_at, last_seen_at] = args;
        this.rows.set(String(id), {
          id, email, display_name, photo_url, phone_country: null, phone: null,
          created_at, updated_at, last_seen_at,
        });
      } else if (/^UPDATE users/i.test(sql)) {
        const [email, display_name, photo_url, updated_at, last_seen_at, id] = args;
        const existing = this.rows.get(String(id));
        if (existing) Object.assign(existing, { email, display_name, photo_url, updated_at, last_seen_at });
      }
      // app_settings inserts: nothing here reads that table, so they are ignored.
    }
  }
}

const GOOGLE_URL = 'https://lh3.googleusercontent.com/a/live-and-rotating';

describe('UserAccountStore.ensure — the photo priority regression', () => {
  it('adopts Google’s photo the first time, converted rather than as the live URL', async () => {
    const sql = new FakeUsers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/png' },
      blob: async () => ({ size: 4, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer }),
    }) as unknown as typeof fetch;
    const store = new UserAccountStore(sql);

    const account = await store.ensure({ uid: 'u1', email: 'a@b.c', photoUrl: GOOGLE_URL });

    expect(account.photoUrl).toMatch(/^data:image\/png;base64,/);
    expect(account.photoUrl).not.toContain('googleusercontent');
  });

  it('never overwrites an already-stored photo with Google’s current one on a later sign-in', async () => {
    // This is the exact regression: a photo that was already saved — however
    // it got there — must survive every later call, because `ensure()` runs
    // on every sign-in and every restored session, not once.
    const sql = new FakeUsers();
    await sql.transaction([{
      sql: `INSERT INTO users (id, email, display_name, photo_url, created_at, updated_at, last_seen_at) VALUES (?,?,?,?,?,?,?)`,
      args: ['u1', 'a@b.c', 'Karthick', 'data:image/jpeg;base64,PREVIOUSLYSTORED', 't0', 't0', 't0'],
    }]);
    const store = new UserAccountStore(sql);
    global.fetch = jest.fn(); // must not be called at all — a stored photo needs no fetch

    const account = await store.ensure({ uid: 'u1', email: 'a@b.c', photoUrl: GOOGLE_URL });

    expect(account.photoUrl).toBe('data:image/jpeg;base64,PREVIOUSLYSTORED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('still refreshes the name and email on every call, unlike the photo', async () => {
    const sql = new FakeUsers();
    await sql.transaction([{
      sql: `INSERT INTO users (id, email, display_name, photo_url, created_at, updated_at, last_seen_at) VALUES (?,?,?,?,?,?,?)`,
      args: ['u1', 'old@b.c', 'Old Name', 'data:image/jpeg;base64,KEEPME', 't0', 't0', 't0'],
    }]);
    const store = new UserAccountStore(sql);

    const account = await store.ensure({ uid: 'u1', email: 'new@b.c', displayName: 'New Name' });

    expect(account.email).toBe('new@b.c');
    expect(account.displayName).toBe('New Name');
    expect(account.photoUrl).toBe('data:image/jpeg;base64,KEEPME');
  });
});
