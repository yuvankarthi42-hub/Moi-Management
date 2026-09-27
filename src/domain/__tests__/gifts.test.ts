import type { GiftEntry, GiftGiven } from '../models';
import {
  selectFunctions,
  selectGiftNames,
  selectGiftTimelineForPerson,
  selectGiftsForPerson,
  selectGiftsGivenForPerson,
  selectOverview,
  selectPeople,
} from '../selectors';
import { makeDataset, NOW } from './fixtures';

const T = '2026-01-01T00:00:00.000Z';

function gift(over: Partial<GiftEntry> = {}): GiftEntry {
  return {
    id: 'gf1',
    functionId: 'fn1',
    personId: 'p1',
    name: 'Silver bowl',
    recordedAt: T,
    ...over,
  };
}

function returned(over: Partial<GiftGiven> = {}): GiftGiven {
  return {
    id: 'gg1',
    personId: 'p1',
    name: 'Saree',
    date: '2026-03-01',
    createdAt: T,
    ...over,
  };
}

/**
 * fn1 in the fixture collects 1001 + 2001 + 500 = 3502 in cash across three
 * entries. A gift is a separate record, so none of that arithmetic can move —
 * which is what these check.
 */
describe('gifts are kept apart from moi', () => {
  it('leaves a function’s collection untouched, priced or not', () => {
    const base = makeDataset();
    const unpriced = makeDataset({ gifts: [gift()] });
    const priced = makeDataset({ gifts: [gift({ value: 8000 })] });

    const before = selectFunctions(base, NOW).find((f) => f.id === 'fn1')!;
    expect(before.collected).toBe(3502);
    expect(selectFunctions(unpriced, NOW).find((f) => f.id === 'fn1')!.collected).toBe(3502);
    expect(selectFunctions(priced, NOW).find((f) => f.id === 'fn1')!.collected).toBe(3502);
  });

  it('counts gifts on the function without touching its entry count', () => {
    const data = makeDataset({ gifts: [gift(), gift({ id: 'gf2', value: 8000 })] });
    const fn = selectFunctions(data, NOW).find((f) => f.id === 'fn1')!;

    expect(fn.entryCount).toBe(3);
    expect(fn.giftCount).toBe(2);
    // Reported, never added to `collected`.
    expect(fn.giftValue).toBe(8000);
  });

  it('leaves the household totals and the average alone', () => {
    const base = selectOverview(makeDataset(), NOW);
    const after = selectOverview(makeDataset({ gifts: [gift({ value: 64000 })] }), NOW);

    expect(after.totalMoi).toBe(base.totalMoi);
    expect(after.averageMoi).toBe(base.averageMoi);
    expect(after.giftCount).toBe(1);
  });

  it('leaves what a person has given, and so their balance, alone', () => {
    const base = selectPeople(makeDataset()).find((p) => p.id === 'p1')!;
    const after = selectPeople(
      makeDataset({ gifts: [gift({ value: 5000 })], giftsGiven: [returned()] }),
    ).find((p) => p.id === 'p1')!;

    expect(after.totalReceived).toBe(base.totalReceived);
    expect(after.balance).toBe(base.balance);
    expect(after.giftCount).toBe(1);
    expect(after.giftsReturnedCount).toBe(1);
  });
});

describe('a person’s gifts', () => {
  it('lists what they gave and what went back, newest first', () => {
    const data = makeDataset({
      gifts: [
        gift({ id: 'a', recordedAt: '2026-01-01T00:00:00.000Z' }),
        gift({ id: 'b', name: 'Watch', recordedAt: '2026-06-01T00:00:00.000Z' }),
      ],
      giftsGiven: [returned()],
    });

    expect(selectGiftsForPerson(data, 'p1').map((g) => g.id)).toEqual(['b', 'a']);
    expect(selectGiftsGivenForPerson(data, 'p1').map((g) => g.name)).toEqual(['Saree']);
  });

  it('does not mix in another person’s', () => {
    const data = makeDataset({ gifts: [gift({ personId: 'p2' })] });
    expect(selectGiftsForPerson(data, 'p1')).toHaveLength(0);
  });
});

describe('gift name suggestions', () => {
  it('learn from both directions, most used first', () => {
    const data = makeDataset({
      gifts: [
        gift({ id: 'a', name: 'Saree' }),
        gift({ id: 'b', name: 'Saree' }),
        gift({ id: 'c', name: 'Watch' }),
      ],
      giftsGiven: [returned({ name: 'Saree' })],
    });

    expect(selectGiftNames(data)).toEqual(['Saree', 'Watch']);
  });
});

describe('the gift timeline', () => {
  it('interleaves both directions by date, newest first', () => {
    const data = makeDataset({
      gifts: [
        // fn1 is dated 2026-01-10, which is the date a received gift takes.
        gift({ id: 'recv', name: 'Gold chain' }),
      ],
      giftsGiven: [
        returned({ id: 'ret-old', name: 'Saree', date: '2025-06-01' }),
        returned({ id: 'ret-new', name: 'Watch', date: '2026-08-01' }),
      ],
    });

    expect(selectGiftTimelineForPerson(data, 'p1').map((r) => [r.id, r.direction])).toEqual([
      ['ret-new', 'returned'],
      ['recv', 'received'],
      ['ret-old', 'returned'],
    ]);
  });

  it('gives a received row its function, and a returned row its occasion', () => {
    const data = makeDataset({
      gifts: [gift()],
      giftsGiven: [returned({ occasion: 'Their daughter\u2019s wedding' })],
    });
    const rows = selectGiftTimelineForPerson(data, 'p1');

    const received = rows.find((r) => r.direction === 'received')!;
    expect(received.title).toBe('Wedding');
    expect(received.functionId).toBe('fn1');

    const back = rows.find((r) => r.direction === 'returned')!;
    expect(back.title).toBe('Their daughter\u2019s wedding');
    // Nothing to open: a return gift belongs to their event, not ours.
    expect(back.functionId).toBeUndefined();
  });

  it('leaves another person out of it', () => {
    const data = makeDataset({ gifts: [gift({ personId: 'p2' })] });
    expect(selectGiftTimelineForPerson(data, 'p1')).toHaveLength(0);
  });
});
