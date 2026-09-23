import type { Dataset } from '../models';
import { EMPTY_DATASET } from '../models';

/**
 * A tiny, hand-checked dataset.
 *
 * Every expected figure in the tests is worked out by hand from these rows, so
 * a failure means the calculation changed — not that a fixture drifted.
 */
export function makeDataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    ...EMPTY_DATASET,
    people: [
      { id: 'p1', name: 'Murugan', village: 'Tenkasi', familyId: 'f1', createdAt: T },
      { id: 'p2', name: 'Selvam', village: 'Madurai', familyId: 'f1', createdAt: T },
      { id: 'p3', name: 'Priya', village: 'Tenkasi', createdAt: T },
    ],
    families: [{ id: 'f1', name: 'Murugan Family', village: 'Tenkasi', createdAt: T }],
    functions: [
      // A past function with moi, expenses and guests.
      {
        id: 'fn1', title: 'Wedding', type: 'wedding', date: '2026-01-10',
        village: 'Tenkasi', createdAt: T,
      },
      // An upcoming function with nothing recorded yet.
      {
        id: 'fn2', title: 'Ear Piercing', type: 'ear_piercing', date: '2026-12-20',
        village: 'Madurai', createdAt: T,
      },
    ],
    moiEntries: [
      { id: 'm1', functionId: 'fn1', personId: 'p1', amount: 1001, paymentType: 'cash', recordedAt: '2026-01-10T04:00:00.000Z' },
      { id: 'm2', functionId: 'fn1', personId: 'p2', amount: 2001, paymentType: 'upi', recordedAt: '2026-01-10T05:00:00.000Z' },
      { id: 'm3', functionId: 'fn1', personId: 'p1', amount: 500, paymentType: 'other', recordedAt: '2026-01-10T06:00:00.000Z' },
    ],
    expenses: [
      { id: 'e1', functionId: 'fn1', category: 'food', amount: 1200, paymentType: 'cash', date: '2026-01-09', createdAt: T },
      { id: 'e2', functionId: 'fn1', category: 'hall', amount: 800, paymentType: 'upi', date: '2026-01-08', createdAt: T },
    ],
    personEvents: [],
    familyMembers: [],
    profile: { id: 'me', name: 'Karthick' },
    settings: {
      ...EMPTY_DATASET.settings,
      suggestionRounding: 100,
      auspiciousRupee: true,
    },
    ...overrides,
  };
}

const T = '2026-01-01T00:00:00.000Z';
export const NOW = new Date('2026-06-01T12:00:00.000Z');
