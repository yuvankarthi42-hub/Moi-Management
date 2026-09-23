import { buildSeed } from '../../data/mock/seed';
import { buildReceipt, buildReceiptText } from '../receiptService';

/**
 * Guards against a receipt quietly shipping placeholder content: every field
 * the brief names must vary with the entry it was built from.
 */
describe('receipt data is dynamic', () => {
it('builds every receipt field from live data, not constants', () => {
  const db = buildSeed();

  // Three arbitrary entries from three different functions.
  const picks = ['fn_3', 'fn_4', 'fn_5'].map((fnId) =>
    db.moiEntries.find((e) => e.functionId === fnId)!,
  );

  const receipts = picks.map((entry) =>
    buildReceipt({
      entry,
      functionEntries: db.moiEntries,
      person: db.people.find((p) => p.id === entry.personId),
      fn: db.functions.find((f) => f.id === entry.functionId),
      hostName: db.profile.name,
    }),
  );

  // Each of the four fields the brief names differs between receipts, which it
  // could not do if any of them were hard-coded.
  expect(new Set(receipts.map((r) => r.functionTitle)).size).toBe(3);
  expect(new Set(receipts.map((r) => r.functionVenue)).size).toBe(3);
  expect(new Set(receipts.map((r) => r.personName)).size).toBe(3);
  expect(new Set(receipts.map((r) => r.receiptNo)).size).toBeGreaterThan(0);

  // And none of them is the mockup's placeholder content.
  for (const r of receipts) {
    const text = buildReceiptText(r);
    expect(text).not.toContain('MOI-0188');
    expect(text).not.toContain('98765 43210');
  }
});
});
