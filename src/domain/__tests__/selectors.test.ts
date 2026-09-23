import {
  buildExpenseReport, buildFunctionReport, buildPaymentMethodReport,
  buildPersonReport, buildReturnMoiReport, buildTopContributors, buildVillageReport,
  searchAll, selectFunctionById, selectFunctions, selectOverview,
  selectPeople, suggestReturnAmount,
} from '../selectors';
import { makeDataset, NOW } from './fixtures';

describe('function totals (spec §39)', () => {
  it('sums moi, expenses and guests from their rows, never from a stored field', () => {
    const fn = selectFunctionById(makeDataset(), 'fn1', NOW)!;

    expect(fn.collected).toBe(1001 + 2001 + 500);
    expect(fn.entryCount).toBe(3);
    expect(fn.expenses).toBe(1200 + 800);
    expect(fn.expenseCount).toBe(2);
    expect(fn.net).toBe(3502 - 2000);
  });

  it('marks functions upcoming or completed by date', () => {
    const [first, second] = selectFunctions(makeDataset(), NOW);
    // Sorted newest first, so the December function leads.
    expect(first.id).toBe('fn2');
    expect(first.status).toBe('upcoming');
    expect(second.status).toBe('completed');
  });
});

describe('overview', () => {
  it('reports totals and the balance after expenses', () => {
    const overview = selectOverview(makeDataset(), NOW);

    expect(overview.functionCount).toBe(2);
    expect(overview.upcomingCount).toBe(1);
    expect(overview.totalMoi).toBe(3502);
    expect(overview.totalExpenses).toBe(2000);
    expect(overview.balance).toBe(1502);
    expect(overview.peopleCount).toBe(3);
    expect(overview.averageMoi).toBe(Math.round(3502 / 3));
  });
});

describe('people', () => {
  it('aggregates a person across every function they gave at', () => {
    const murugan = selectPeople(makeDataset()).find((p) => p.id === 'p1')!;

    expect(murugan.totalGiven).toBe(1001 + 500);
    // Two entries, but both at the same function.
    expect(murugan.functionCount).toBe(1);
    expect(murugan.familyName).toBe('Murugan Family');
  });

  it('gives people with no entries a zero total rather than omitting them', () => {
    const priya = selectPeople(makeDataset()).find((p) => p.id === 'p3')!;
    expect(priya.totalGiven).toBe(0);
    expect(priya.functionCount).toBe(0);
  });
});

describe('reports', () => {
  it('builds the function report from transaction rows', () => {
    const report = buildFunctionReport(makeDataset());

    expect(report.totalFunctions).toBe(2);
    expect(report.totalCollection).toBe(3502);
    expect(report.totalExpenses).toBe(2000);
    expect(report.averageMoi).toBe(Math.round(3502 / 3));
  });

  it('ranks people by what they gave', () => {
    const rows = buildPersonReport(makeDataset());

    expect(rows[0]).toMatchObject({ id: 'p2', total: 2001 });
    expect(rows[1]).toMatchObject({ id: 'p1', total: 1501 });
    // Someone who never gave does not appear in the report at all.
    expect(rows.find((r) => r.id === 'p3')).toBeUndefined();
  });

  it('groups collections by village', () => {
    const rows = buildVillageReport(makeDataset());

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ label: 'Madurai', total: 2001, peopleCount: 1 });
    expect(rows[1]).toMatchObject({ label: 'Tenkasi', total: 1501, peopleCount: 1 });
  });

  it('computes each contributor’s share of the whole', () => {
    const rows = buildTopContributors(makeDataset());
    const totalShare = rows.reduce((sum, r) => sum + r.share, 0);

    expect(rows[0].rank).toBe(1);
    expect(totalShare).toBeCloseTo(1, 5);
  });

  it('breaks expenses down by category', () => {
    const report = buildExpenseReport(makeDataset());

    expect(report.total).toBe(2000);
    expect(report.rows[0]).toMatchObject({ key: 'food', total: 1200 });
    expect(report.split.cash).toBe(1200);
    expect(report.split.upi).toBe(800);
  });

  it('splits moi and expenses by payment method', () => {
    const report = buildPaymentMethodReport(makeDataset());

    expect(report.moi).toMatchObject({ cash: 1001, upi: 2001, other: 500, total: 3502 });
    expect(report.expenses).toMatchObject({ cash: 1200, upi: 800, total: 2000 });
    expect(report.moiCounts.cash).toBe(1);
  });

  it('restricts a report to its date range', () => {
    // fn1 is in January; a February-onwards range should exclude it entirely.
    const report = buildFunctionReport(makeDataset(), { from: '2026-02-01' });

    expect(report.totalFunctions).toBe(1);
    expect(report.totalCollection).toBe(0);
    expect(report.totalExpenses).toBe(0);
  });
});

describe('return moi', () => {
  it('suggests what the person last gave, rounded and made auspicious', () => {
    // Round to 100 with the extra rupee: 1001 stays 1001, 1250 becomes 1301.
    expect(suggestReturnAmount(1001, 100, true)).toBe(1001);
    expect(suggestReturnAmount(1250, 100, true)).toBe(1301);
    expect(suggestReturnAmount(1250, 100, false)).toBe(1300);
    expect(suggestReturnAmount(0, 100, true)).toBe(0);
  });

  it('lists only guests whose own function falls inside the window', () => {
    const data = makeDataset({
      personEvents: [
        { id: 'pe1', personId: 'p1', title: 'Marriage', type: 'wedding', date: '2026-06-10', createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'pe2', personId: 'p2', title: 'Far off', type: 'wedding', date: '2027-06-10', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    });

    const rows = buildReturnMoiReport(data, { withinDays: 30, now: NOW });

    expect(rows).toHaveLength(1);
    expect(rows[0].person.id).toBe('p1');
    expect(rows[0].daysAway).toBe(9);
    // p1 gave twice at fn1 (₹1001 + ₹500), so the occasion total is ₹1501 —
    // not one arbitrary row.
    expect(rows[0].lastReceived).toBe(1501);
    expect(rows[0].suggested).toBe(1501);
  });

  it('ignores events that have already passed', () => {
    const data = makeDataset({
      personEvents: [
        { id: 'pe1', personId: 'p1', title: 'Past', type: 'wedding', date: '2026-01-01', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    expect(buildReturnMoiReport(data, { now: NOW })).toHaveLength(0);
  });
});

describe('global search (spec §17)', () => {
  it('finds a person and their moi entries in one pass', () => {
    const results = searchAll(makeDataset(), 'murugan');
    const kinds = new Set(results.map((r) => r.kind));

    expect(kinds.has('person')).toBe(true);
    expect(kinds.has('moi')).toBe(true);
  });

  it('matches functions by village as well as name', () => {
    const results = searchAll(makeDataset(), 'madurai');
    expect(results.some((r) => r.kind === 'function' && r.id === 'fn2')).toBe(true);
  });

  it('returns nothing for an empty query', () => {
    expect(searchAll(makeDataset(), '   ')).toHaveLength(0);
  });
});
