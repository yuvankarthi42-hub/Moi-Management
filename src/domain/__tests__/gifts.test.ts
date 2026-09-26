import type { MoiEntry } from '../models';
import { selectFunctions, selectOverview, selectPeople } from '../selectors';
import { makeDataset, NOW } from './fixtures';

const T = '2026-01-01T00:00:00.000Z';

function gift(over: Partial<MoiEntry> = {}): MoiEntry {
  return {
    id: 'g1',
    functionId: 'fn1',
    personId: 'p1',
    kind: 'gift',
    amount: 0,
    paymentType: 'cash',
    giftName: 'Vessels set',
    recordedAt: T,
    ...over,
  };
}

/**
 * fn1 in the fixture collects 1001 + 2001 + 500 = 3502 in cash across three
 * entries. Every figure below is that arithmetic, plus whatever the gift does
 * or — the point of these tests — does not do to it.
 */
describe('a gift never joins the collection', () => {
  it('leaves moi collected alone when it carries no value', () => {
    const base = makeDataset();
    const withGift = makeDataset({ moiEntries: [...base.moiEntries, gift()] });

    const before = selectFunctions(base, NOW).find((f) => f.id === 'fn1')!;
    const after = selectFunctions(withGift, NOW).find((f) => f.id === 'fn1')!;

    expect(before.collected).toBe(3502);
    expect(after.collected).toBe(3502);
  });

  it('leaves it alone when the host did put a price on it', () => {
    const base = makeDataset();
    const withGift = makeDataset({
      moiEntries: [...base.moiEntries, gift({ giftValue: 64000 })],
    });

    const fn = selectFunctions(withGift, NOW).find((f) => f.id === 'fn1')!;
    expect(fn.collected).toBe(3502);
    // Reported, but on its own.
    expect(fn.giftValue).toBe(64000);
  });

  it('counts toward entries and gifts, so it is never invisible', () => {
    const base = makeDataset();
    const withGift = makeDataset({ moiEntries: [...base.moiEntries, gift()] });
    const fn = selectFunctions(withGift, NOW).find((f) => f.id === 'fn1')!;

    expect(fn.entryCount).toBe(4);
    expect(fn.giftCount).toBe(1);
  });

  it('keeps out of the household total and its average', () => {
    const base = makeDataset();
    const withGift = makeDataset({
      moiEntries: [...base.moiEntries, gift({ giftValue: 64000 })],
    });

    const before = selectOverview(base, NOW);
    const after = selectOverview(withGift, NOW);

    expect(after.totalMoi).toBe(before.totalMoi);
    // Averaged over cash entries, so three gifts cannot drag it down.
    expect(after.averageMoi).toBe(before.averageMoi);
    expect(after.giftCount).toBe(1);
  });

  it('keeps out of what a person has given, and so out of their balance', () => {
    const base = makeDataset();
    const withGift = makeDataset({
      moiEntries: [...base.moiEntries, gift({ personId: 'p1', giftValue: 5000 })],
    });

    const before = selectPeople(base).find((p) => p.id === 'p1')!;
    const after = selectPeople(withGift).find((p) => p.id === 'p1')!;

    expect(after.totalReceived).toBe(before.totalReceived);
    expect(after.balance).toBe(before.balance);
  });
});
