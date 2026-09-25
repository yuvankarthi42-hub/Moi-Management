import { makeDataset } from '../../domain/__tests__/fixtures';
import {
  selectExpensesForFunction,
  selectFunctionById,
  selectMoiEntriesForFunction,
} from '../../domain/selectors';
import { buildFunctionSheetHtml } from '../functionSheet';

/**
 * fn1 in the fixture: three moi entries (1001 + 2001 + 500 = 3502) and two
 * expenses (1200 + 800 = 2000), so net is 1502. Every figure below is that
 * arithmetic, not a snapshot.
 */
function sheet() {
  const data = makeDataset();
  const fn = selectFunctionById(data, 'fn1');
  if (!fn) throw new Error('fixture lost fn1');
  return buildFunctionSheetHtml({
    fn,
    entries: selectMoiEntriesForFunction(data, 'fn1'),
    expenses: selectExpensesForFunction(data, 'fn1'),
    hostName: data.profile.name,
  });
}

describe('function sheet', () => {
  it('carries all three sections in one document', () => {
    const { html } = sheet();
    expect(html).toContain('Function overview');
    expect(html).toContain('Moi details (3 entries)');
    expect(html).toContain('Expenses (2 items)');
  });

  it('titles the document after the function', () => {
    const { html, title } = sheet();
    expect(title).toBe('Wedding');
    expect(html).toContain('<h1>Wedding</h1>');
  });

  it('lists every giver with their amount', () => {
    const { html } = sheet();
    for (const name of ['Murugan', 'Selvam']) expect(html).toContain(name);
    for (const amount of ['1,001', '2,001', '500']) expect(html).toContain(`₹${amount}`);
  });

  it('lists every expense with its category', () => {
    const { html } = sheet();
    expect(html).toContain('Food');
    expect(html).toContain('Hall');
    expect(html).toContain('₹1,200');
    expect(html).toContain('₹800');
  });

  it('totals each section from the rows, not from a stored figure', () => {
    const { html } = sheet();
    // 1001 + 2001 + 500, and 1200 + 800
    expect(html).toContain('₹3,502');
    expect(html).toContain('₹2,000');
    // collected − expenses
    expect(html).toContain('₹1,502');
  });

  it('says so plainly when a function has nothing recorded', () => {
    const data = makeDataset();
    const fn = selectFunctionById(data, 'fn2');
    if (!fn) throw new Error('fixture lost fn2');
    const { html } = buildFunctionSheetHtml({
      fn,
      entries: [],
      expenses: [],
      hostName: data.profile.name,
    });
    expect(html).toContain('No moi recorded for this function.');
    expect(html).toContain('No expenses recorded for this function.');
  });

  it('escapes a title that would otherwise close a tag', () => {
    const data = makeDataset();
    const fn = selectFunctionById(data, 'fn1');
    if (!fn) throw new Error('fixture lost fn1');
    const { html } = buildFunctionSheetHtml({
      fn: { ...fn, title: '<script>x</script>' },
      entries: [],
      expenses: [],
      hostName: data.profile.name,
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
