import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DirectSqlClient } from '../../src/data/turso/SqlClient';
import { TursoDataSource, type UserScope } from '../../src/data/turso/TursoDataSource';

/**
 * Isolation, proved against the real Turso database.
 *
 * Deliberately outside the default `testMatch`: it needs credentials and a
 * network, so it is run on demand rather than on every commit.
 *
 *   npx jest --testMatch '**\/db/live/*.live.test.ts'
 *
 * Two users are created, one writes, and the other tries every way in.
 */

const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const scopeFor = (id: string): UserScope => ({
  currentUserId: () => id,
  requireUserId: () => id,
});

const stamp = Date.now().toString(36);
const ALICE = `live_alice_${stamp}`;
const BOB = `live_bob_${stamp}`;

const sql = new DirectSqlClient(
  env.EXPO_PUBLIC_TURSO_URL,
  env.EXPO_PUBLIC_TURSO_TOKEN_DEV_ONLY,
);
const alice = new TursoDataSource(sql, scopeFor(ALICE));
const bob = new TursoDataSource(sql, scopeFor(BOB));

let alicePerson = '';
let aliceFunction = '';
let aliceMoi = '';

beforeAll(async () => {
  for (const id of [ALICE, BOB]) {
    await sql.transaction([{
      sql: `INSERT INTO users (id, email, display_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, `${id}@example.test`, id, new Date().toISOString(), new Date().toISOString()],
    }]);
  }
  const person = await alice.createPerson({ name: 'Ramu', village: 'Sengalpattu' });
  const fn = await alice.createFunction({ title: 'Wedding', type: 'wedding', date: '2026-01-10' });
  const moi = await alice.createMoiEntry({
    functionId: fn.id, personId: person.id, amount: 2001, paymentType: 'cash',
  });
  alicePerson = person.id;
  aliceFunction = fn.id;
  aliceMoi = moi.id;
}, 60_000);

afterAll(async () => {
  // Hard delete: these are test users, not records anybody wants back.
  for (const id of [ALICE, BOB]) {
    await sql.transaction([
      { sql: `DELETE FROM moi WHERE user_id = ?`, args: [id] },
      { sql: `DELETE FROM gifts WHERE user_id = ?`, args: [id] },
      { sql: `DELETE FROM expenses WHERE user_id = ?`, args: [id] },
      { sql: `DELETE FROM person_events WHERE user_id = ?`, args: [id] },
      { sql: `DELETE FROM functions WHERE user_id = ?`, args: [id] },
      { sql: `DELETE FROM people WHERE user_id = ?`, args: [id] },
      { sql: `DELETE FROM app_settings WHERE user_id = ?`, args: [id] },
      { sql: `DELETE FROM users WHERE id = ?`, args: [id] },
    ]);
  }
}, 60_000);

describe('Alice can reach her own records', () => {
  it('lists them', async () => {
    expect((await alice.listPeople()).map((p) => p.name)).toEqual(['Ramu']);
    expect((await alice.listFunctions()).map((f) => f.title)).toEqual(['Wedding']);
    expect((await alice.listMoiEntries()).map((m) => m.amount)).toEqual([2001]);
  });
});

describe('Bob cannot read anything of Alice’s', () => {
  it('sees an empty book', async () => {
    expect(await bob.listPeople()).toEqual([]);
    expect(await bob.listFunctions()).toEqual([]);
    expect(await bob.listMoiEntries()).toEqual([]);
    expect(await bob.listGifts()).toEqual([]);
    expect(await bob.listExpenses()).toEqual([]);
    expect(await bob.listPersonEvents()).toEqual([]);
  });

  it('cannot fetch her person or function by id', async () => {
    expect(await bob.getPerson(alicePerson)).toBeUndefined();
    expect(await bob.getFunction(aliceFunction)).toBeUndefined();
  });

  it('cannot export her books', async () => {
    const backup = await bob.exportAll();
    expect(backup.people).toEqual([]);
    expect(backup.moiEntries).toEqual([]);
  });
});

describe('Bob cannot write into anything of Alice’s', () => {
  it('cannot add moi to her function', async () => {
    await expect(
      bob.createMoiEntry({
        functionId: aliceFunction, personId: alicePerson, amount: 99, paymentType: 'cash',
      }),
    ).rejects.toThrow(/could not be found/i);
  });

  it('cannot add a gift or an expense to her function', async () => {
    await expect(
      bob.createGift({ functionId: aliceFunction, personId: alicePerson, name: 'Bowl' }),
    ).rejects.toThrow(/could not be found/i);
    await expect(
      bob.createExpense({
        functionId: aliceFunction, category: 'hall', amount: 500,
        paymentType: 'cash', date: '2026-01-09',
      }),
    ).rejects.toThrow(/could not be found/i);
  });

  it('cannot attach an event to her person', async () => {
    await expect(
      bob.createPersonEvent({
        personId: alicePerson, title: 'Theirs', type: 'wedding', date: '2026-05-01',
      }),
    ).rejects.toThrow(/could not be found/i);
  });

  it('cannot edit or delete her records', async () => {
    await expect(bob.updatePerson(alicePerson, { name: 'Hacked' })).rejects.toThrow();
    await expect(bob.updateMoiEntry(aliceMoi, { amount: 1 })).rejects.toThrow();
    // A delete that matches no row is not an error, but it must change nothing.
    await bob.deletePerson(alicePerson);
    await bob.deleteFunction(aliceFunction);
    await bob.deleteMoiEntry(aliceMoi);
  });
});

describe('Alice’s records survived all of that, untouched', () => {
  it('still reads exactly as it was written', async () => {
    const people = await alice.listPeople();
    expect(people).toHaveLength(1);
    expect(people[0].name).toBe('Ramu');

    const entries = await alice.listMoiEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].amount).toBe(2001);

    expect(await alice.listFunctions()).toHaveLength(1);
  });
});
