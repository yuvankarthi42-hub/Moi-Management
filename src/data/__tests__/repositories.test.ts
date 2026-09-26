import { MockDataSource } from '../mock/MockDataSource';
import { ExpenseRepository } from '../repositories/ExpenseRepository';
import { FunctionRepository } from '../repositories/FunctionRepository';
import { MoiRepository } from '../repositories/MoiRepository';
import { PeopleRepository, normalisePhone } from '../repositories/PeopleRepository';
import { ValidationError } from '../repositories/errors';

// The in-memory source persists through AsyncStorage, which jest-expo mocks.
function makeRepos() {
  const source = new MockDataSource();
  return {
    source,
    people: new PeopleRepository(source),
    functions: new FunctionRepository(source),
    moi: new MoiRepository(source),
    expenses: new ExpenseRepository(source),
  };
}

describe('PeopleRepository', () => {
  it('rejects a person with no name', async () => {
    const { people } = makeRepos();
    await expect(people.create({ name: '  ' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('refuses a duplicate phone so moi history is not split in two', async () => {
    const { people } = makeRepos();
    await people.create({ name: 'Murugan', phone: '9876543210' });

    await expect(people.create({ name: 'Murugan M', phone: '98765 43210' })).rejects.toThrow(
      /already uses this phone/i,
    );
  });

  it('normalises phone numbers before comparing them', () => {
    expect(normalisePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalisePhone('098765 43210')).toBe('9876543210');
    expect(normalisePhone('9876543210')).toBe('9876543210');
  });
});

describe('MoiRepository', () => {
  it('requires a function, a person and a positive amount', async () => {
    const { moi } = makeRepos();
    const base = { functionId: 'fn1', personId: 'p1', kind: 'cash' as const, amount: 1001, paymentType: 'cash' as const };

    await expect(moi.create({ ...base, functionId: '' })).rejects.toThrow(/function/i);
    await expect(moi.create({ ...base, personId: '' })).rejects.toThrow(/person/i);
    await expect(moi.create({ ...base, amount: 0 })).rejects.toThrow(/more than zero/i);
    await expect(moi.create({ ...base, amount: -5 })).rejects.toThrow(/more than zero/i);
  });

  it('asks a gift what it was, not how much', async () => {
    const { moi } = makeRepos();
    const base = {
      functionId: 'fn1', personId: 'p1', kind: 'gift' as const,
      amount: 0, paymentType: 'cash' as const,
    };

    await expect(moi.create({ ...base, giftName: '  ' })).rejects.toThrow(/what the gift was/i);
    const saved = await moi.create({ ...base, giftName: '  Vessels set  ' });
    expect(saved.giftName).toBe('Vessels set');
    expect(saved.amount).toBe(0);
  });

  it('pins a gift\'s amount to zero even if a caller passes one', async () => {
    const { moi } = makeRepos();
    const saved = await moi.create({
      functionId: 'fn1', personId: 'p1', kind: 'gift',
      amount: 9999, paymentType: 'cash', giftName: 'Silver lamp', giftValue: 8000,
    });
    // The value is kept; the amount — which every total sums — is not.
    expect(saved.amount).toBe(0);
    expect(saved.giftValue).toBe(8000);
  });

  it('drops gift fields from a cash entry', async () => {
    const { moi } = makeRepos();
    const saved = await moi.create({
      functionId: 'fn1', personId: 'p1', kind: 'cash', amount: 501,
      paymentType: 'cash', giftName: 'Vessels', giftValue: 3000,
    });
    expect(saved.giftName).toBeUndefined();
    expect(saved.giftValue).toBeUndefined();
  });

  it('flags an implausibly large amount rather than storing it silently', async () => {
    const { moi } = makeRepos();
    await expect(
      moi.create({ functionId: 'fn1', personId: 'p1', kind: 'cash' as const, amount: 99_000_000, paymentType: 'cash' }),
    ).rejects.toThrow(/too large/i);
  });

  it('detects an existing entry for the same person at the same function', async () => {
    const { source, moi } = makeRepos();
    await source.init();
    await moi.create({ functionId: 'fnX', personId: 'pX', kind: 'cash' as const, amount: 501, paymentType: 'cash' });

    expect(await moi.findExisting('fnX', 'pX')).toBeDefined();
    expect(await moi.findExisting('fnX', 'pY')).toBeUndefined();
  });
});

describe('FunctionRepository', () => {
  it('requires a title and a valid date', async () => {
    const { functions } = makeRepos();

    await expect(
      functions.create({ title: '', type: 'wedding', date: '2026-01-01' }),
    ).rejects.toThrow(/function name/i);
    await expect(
      functions.create({ title: 'Wedding', type: 'wedding', date: '01-01-2026' }),
    ).rejects.toThrow(/date/i);
  });
});

describe('ExpenseRepository (spec §38)', () => {
  it('never allows an expense without a function', async () => {
    const { expenses } = makeRepos();
    await expect(
      expenses.create({
        functionId: '', category: 'food', amount: 100, paymentType: 'cash', date: '2026-01-01',
      }),
    ).rejects.toThrow(/function/i);
  });

  it('requires a positive amount', async () => {
    const { expenses } = makeRepos();
    await expect(
      expenses.create({
        functionId: 'fn1', category: 'food', amount: 0, paymentType: 'cash', date: '2026-01-01',
      }),
    ).rejects.toThrow(/more than zero/i);
  });
});

describe('cascade deletes (spec §38)', () => {
  it('removes a function’s moi and expenses with it', async () => {
    const { source, functions, moi, expenses } = makeRepos();
    await source.init();

    const fn = await functions.create({ title: 'Test', type: 'other', date: '2026-01-01' });
    await moi.create({ functionId: fn.id, personId: 'p1', kind: 'cash', amount: 501, paymentType: 'cash' });
    await expenses.create({
      functionId: fn.id, category: 'food', amount: 100, paymentType: 'cash', date: '2026-01-01',
    });
    await functions.remove(fn.id);

    expect((await moi.list()).filter((m) => m.functionId === fn.id)).toHaveLength(0);
    expect((await expenses.list()).filter((e) => e.functionId === fn.id)).toHaveLength(0);
  });

});
