import AsyncStorage from '@react-native-async-storage/async-storage';

import { isOnline, reportReachable } from '../../data/connectivity';
import { EMPTY_DATASET, type Dataset } from '../../domain/models';
import { canWrite } from '../AppDataProvider';
import { clearSnapshot, readSnapshot, saveSnapshot } from '../DatasetCache';

/**
 * The two rules the offline behaviour rests on:
 *
 *  1. the cache holds only what was fetched from the database, per user;
 *  2. nothing can be written while the app is showing it.
 */

const datasetWith = (names: string[]): Dataset => ({
  ...EMPTY_DATASET,
  people: names.map((name, i) => ({
    id: `p${i}`,
    name,
    createdAt: '2026-01-01T00:00:00.000Z',
  })),
});

beforeEach(async () => {
  await AsyncStorage.clear();
  reportReachable(true);
});

describe('the snapshot cache', () => {
  it('gives back what was stored', async () => {
    await saveSnapshot('alice', datasetWith(['Ramu', 'Murugan']));
    const cached = await readSnapshot('alice');
    expect(cached?.dataset.people.map((p) => p.name)).toEqual(['Ramu', 'Murugan']);
    expect(cached?.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('is keyed by user, so one account never sees another’s books', async () => {
    await saveSnapshot('alice', datasetWith(['Ramu']));
    await saveSnapshot('bob', datasetWith(['Kavin']));

    expect((await readSnapshot('alice'))?.dataset.people.map((p) => p.name)).toEqual(['Ramu']);
    expect((await readSnapshot('bob'))?.dataset.people.map((p) => p.name)).toEqual(['Kavin']);
    // Someone who has never signed in on this phone gets nothing at all.
    expect(await readSnapshot('carol')).toBeUndefined();
  });

  it('is cleared for one user without touching the other', async () => {
    await saveSnapshot('alice', datasetWith(['Ramu']));
    await saveSnapshot('bob', datasetWith(['Kavin']));

    await clearSnapshot('alice');

    expect(await readSnapshot('alice')).toBeUndefined();
    expect((await readSnapshot('bob'))?.dataset.people).toHaveLength(1);
  });

  it('reads as empty rather than throwing when the store is unusable', async () => {
    const boom = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('no storage'));
    // A private window or cleared site data must not take the app down with it.
    await expect(readSnapshot('alice')).resolves.toBeUndefined();
    boom.mockRestore();
  });

  it('swallows a failed write, because the data is still in memory', async () => {
    const boom = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('full'));
    await expect(saveSnapshot('alice', datasetWith(['Ramu']))).resolves.toBeUndefined();
    boom.mockRestore();
  });

  it('ignores a corrupted entry', async () => {
    await AsyncStorage.setItem('moi-manager/cache/v1/alice', '{not json');
    expect(await readSnapshot('alice')).toBeUndefined();
  });
});

describe('writes are refused while offline', () => {
  it('allows a write only when connected and showing live data', () => {
    expect(canWrite({ online: true, showingCached: false })).toBe(true);
  });

  it('refuses when the database is unreachable', () => {
    expect(canWrite({ online: false, showingCached: false })).toBe(false);
  });

  it('refuses while a cached snapshot is on screen, even once reconnected', () => {
    // The numbers on screen are not the ones in the database yet, so an edit
    // would be applied to the wrong totals.
    expect(canWrite({ online: true, showingCached: true })).toBe(false);
    expect(canWrite({ online: false, showingCached: true })).toBe(false);
  });
});

describe('connectivity', () => {
  it('starts online and follows what the data layer reports', () => {
    expect(isOnline()).toBe(true);
    reportReachable(false);
    expect(isOnline()).toBe(false);
    reportReachable(true);
    expect(isOnline()).toBe(true);
  });
});
