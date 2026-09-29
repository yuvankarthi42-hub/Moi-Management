import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';

import { useAuth } from '../auth';
import { getRepositories, type Repositories } from '../data';
import { useOnline } from '../data/connectivity';
import type {
  NewExpense, NewFamily, NewFamilyMember, NewFunction, NewMoiEntry, NewMoiGiven,
  NewGift, NewGiftGiven, NewPerson, NewPersonEvent,
} from '../data/DataSource';
import {
  EMPTY_DATASET, type AppSettings, type Dataset, type FamilyRole, type ID,
  type UserProfile,
} from '../domain/models';
import { clearSnapshot, readSnapshot, saveSnapshot } from './DatasetCache';

/**
 * Loads the whole dataset into memory once, then hands screens a snapshot plus
 * the mutations that change it.
 *
 * Reloading everything after a write is deliberate: the dataset is small, and
 * it guarantees every screen (home totals, reports, person history) agrees
 * after any edit, with no cache-invalidation logic to get wrong.
 *
 * Offline is read-only, by design and not by accident. When the database cannot
 * be reached the last fetched snapshot is shown and every mutation is refused
 * here — not only hidden in the UI, so a screen that forgets to disable a
 * button still cannot write. And only fetched data is ever cached: a write goes
 * to the database, the snapshot is re-fetched, and it is that fetch which is
 * stored, so the cache can never hold a record the database does not have.
 */

interface AppDataValue {
  data: Dataset;
  loading: boolean;
  error?: string;
  repositories: Repositories;
  /** False when the database is unreachable. Nothing can be written. */
  online: boolean;
  /** When the records on screen came from the cache rather than the database. */
  showingCached: boolean;
  /** When that cached snapshot was fetched, for the offline banner. */
  cachedAt?: string;

  refresh: () => Promise<void>;

  // People & families
  addPerson: (input: NewPerson) => Promise<string>;
  editPerson: (id: ID, patch: Partial<NewPerson>) => Promise<void>;
  removePerson: (id: ID) => Promise<void>;
  addFamily: (input: NewFamily) => Promise<string>;
  editFamily: (id: ID, patch: Partial<NewFamily>) => Promise<void>;
  removeFamily: (id: ID) => Promise<void>;

  // Functions
  addFunction: (input: NewFunction) => Promise<string>;
  editFunction: (id: ID, patch: Partial<NewFunction>) => Promise<void>;
  removeFunction: (id: ID) => Promise<void>;
  addFunctionPhoto: (id: ID, uri: string) => Promise<void>;
  removeFunctionPhoto: (id: ID, uri: string) => Promise<void>;

  // Moi
  addMoiEntry: (input: NewMoiEntry) => Promise<string>;
  editMoiEntry: (id: ID, patch: Partial<NewMoiEntry>) => Promise<void>;
  removeMoiEntry: (id: ID) => Promise<void>;

  // Moi given back to a person
  addMoiGiven: (input: NewMoiGiven) => Promise<string>;

  // Gifts, in both directions
  addGift: (input: NewGift) => Promise<string>;
  editGift: (id: ID, patch: Partial<NewGift>) => Promise<void>;
  removeGift: (id: ID) => Promise<void>;
  addGiftGiven: (input: NewGiftGiven) => Promise<string>;
  editGiftGiven: (id: ID, patch: Partial<NewGiftGiven>) => Promise<void>;
  removeGiftGiven: (id: ID) => Promise<void>;
  editMoiGiven: (id: ID, patch: Partial<NewMoiGiven>) => Promise<void>;
  removeMoiGiven: (id: ID) => Promise<void>;

  // Expenses
  addExpense: (input: NewExpense) => Promise<string>;
  editExpense: (id: ID, patch: Partial<NewExpense>) => Promise<void>;
  removeExpense: (id: ID) => Promise<void>;

  // Family collaboration
  addFamilyMember: (input: NewFamilyMember) => Promise<string>;
  setMemberRole: (id: ID, role: FamilyRole) => Promise<void>;
  removeFamilyMember: (id: ID) => Promise<void>;

  // Guest-hosted events
  addPersonEvent: (input: NewPersonEvent) => Promise<string>;
  removePersonEvent: (id: ID) => Promise<void>;

  // Profile & settings
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  resetDemoData: () => Promise<void>;
  restoreBackup: (json: string) => Promise<void>;
}

/**
 * Raised when a write is attempted with no connection.
 *
 * Its own type so screens can tell "you are offline" apart from a validation
 * failure and say the right thing, rather than showing a network message
 * against a field.
 */
export class OfflineWriteError extends Error {
  constructor() {
    super('You are offline. Reconnect to add, edit or delete.');
    this.name = 'OfflineWriteError';
  }
}

/**
 * Whether a write may go ahead.
 *
 * A named function rather than an inline condition so the rule can be stated
 * and tested on its own: showing a cached snapshot is enough to refuse, even
 * if the connection has come back, because what is on screen is not what the
 * database holds and an edit would be applied to the wrong numbers.
 */
export function canWrite(state: { online: boolean; showingCached: boolean }): boolean {
  return state.online && !state.showingCached;
}

const AppDataContext = createContext<AppDataValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const repositories = useMemo(() => getRepositories(), []);
  const { account, loading: authLoading } = useAuth();
  const online = useOnline();
  const [data, setData] = useState<Dataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [showingCached, setShowingCached] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | undefined>();
  const mounted = useRef(true);
  /** Remembered so a sign-out can clear the snapshot it leaves behind. */
  const lastUserId = useRef<string | undefined>(undefined);
  const userId = account?.id;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Pulls a fresh snapshot of every collection in one pass. */
  const load = useCallback(async () => {
    const { source } = repositories;
    const [
      people, families, functions, moiEntries, moiGiven, gifts, giftsGiven, expenses,
      personEvents, familyMembers, profile, settings,
    ] = await Promise.all([
      source.listPeople(),
      source.listFamilies(),
      source.listFunctions(),
      source.listMoiEntries(),
      source.listMoiGiven(),
      source.listGifts(),
      source.listGiftsGiven(),
      source.listExpenses(),
      source.listPersonEvents(),
      source.listFamilyMembers(),
      source.getProfile(),
      source.getSettings(),
    ]);
    if (!mounted.current) return;
    const snapshot: Dataset = {
      people, families, functions, moiEntries, moiGiven, gifts, giftsGiven, expenses,
      personEvents, familyMembers, profile, settings,
    };
    setData(snapshot);
    setShowingCached(false);
    setCachedAt(undefined);
    // Cached only here, where the data has just come from the database. No
    // mutation writes to the cache, so it cannot drift from what is stored.
    if (userId) void saveSnapshot(userId, snapshot);
  }, [repositories, userId]);

  useEffect(() => {
    let cancelled = false;

    // Nothing to fetch until somebody is signed in, and every query would
    // throw for want of a user id. Hold the empty dataset instead.
    if (authLoading) return;
    if (!userId) {
      // Signing out is a request to leave nothing behind on this phone, so the
      // snapshot goes with the session. It is keyed by user id, so another
      // account could never have read it anyway — this is about the person who
      // just signed out, on a phone they may be handing back.
      const previous = lastUserId.current;
      if (previous) void clearSnapshot(previous);
      lastUserId.current = undefined;
      setData(EMPTY_DATASET);
      setShowingCached(false);
      setError(undefined);
      setLoading(false);
      return;
    }
    lastUserId.current = userId;

    setLoading(true);
    (async () => {
      try {
        await repositories.source.init();
        if (!cancelled) await load();
      } catch (e) {
        if (cancelled) return;
        // The database could not be reached. Fall back to the last snapshot
        // fetched for *this* user — never another account's.
        const cached = await readSnapshot(userId);
        if (cancelled) return;
        if (cached) {
          setData(cached.dataset);
          setShowingCached(true);
          setCachedAt(cached.fetchedAt);
          setError(undefined);
        } else {
          setError(e instanceof Error ? e.message : 'Could not load your data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [repositories, load, userId, authLoading]);

  /** Retries the fetch when the connection comes back. */
  useEffect(() => {
    if (!online || !userId || !showingCached) return;
    void load().catch(() => {
      // Still unreachable. The cached snapshot stays on screen.
    });
  }, [online, userId, showingCached, load]);

  /**
   * Runs a mutation and refreshes the snapshot. Errors propagate so the calling
   * screen can show them inline — this layer only guarantees consistency.
   */
  const mutate = useCallback(
    async <T,>(op: () => Promise<T>): Promise<T> => {
      // The single gate on every write in the app. Screens also disable their
      // own buttons, but this is what makes offline read-only true rather than
      // merely discouraged: a screen that forgets still cannot get through.
      if (!canWrite({ online, showingCached })) {
        throw new OfflineWriteError();
      }
      const result = await op();
      await load();
      return result;
    },
    [load, online, showingCached],
  );

  const value = useMemo<AppDataValue>(() => {
    const {
      people, functions, moi, moiGiven, gifts, expenses, familyMembers, settings,
    } = repositories;
    return {
      data,
      loading,
      error,
      repositories,
      online,
      showingCached,
      cachedAt,
      refresh: load,

      addPerson: (input) => mutate(() => people.create(input)).then((p) => p.id),
      editPerson: (id, patch) => mutate(() => people.update(id, patch)).then(() => undefined),
      removePerson: (id) => mutate(() => people.remove(id)),
      addFamily: (input) => mutate(() => people.createFamily(input)).then((f) => f.id),
      editFamily: (id, patch) => mutate(() => people.updateFamily(id, patch)).then(() => undefined),
      removeFamily: (id) => mutate(() => people.removeFamily(id)),

      addFunction: (input) => mutate(() => functions.create(input)).then((f) => f.id),
      editFunction: (id, patch) => mutate(() => functions.update(id, patch)).then(() => undefined),
      removeFunction: (id) => mutate(() => functions.remove(id)),
      addFunctionPhoto: (id, uri) => mutate(() => functions.addPhoto(id, uri)).then(() => undefined),
      removeFunctionPhoto: (id, uri) =>
        mutate(() => functions.removePhoto(id, uri)).then(() => undefined),

      addMoiEntry: (input) => mutate(() => moi.create(input)).then((m) => m.id),
      editMoiEntry: (id, patch) => mutate(() => moi.update(id, patch)).then(() => undefined),
      removeMoiEntry: (id) => mutate(() => moi.remove(id)),

      addGift: (input) => mutate(() => gifts.create(input)).then((g) => g.id),
      editGift: (id, patch) => mutate(() => gifts.update(id, patch)).then(() => undefined),
      removeGift: (id) => mutate(() => gifts.remove(id)),
      addGiftGiven: (input) => mutate(() => gifts.createGiven(input)).then((g) => g.id),
      editGiftGiven: (id, patch) =>
        mutate(() => gifts.updateGiven(id, patch)).then(() => undefined),
      removeGiftGiven: (id) => mutate(() => gifts.removeGiven(id)),
      addMoiGiven: (input) => mutate(() => moiGiven.create(input)).then((g) => g.id),
      editMoiGiven: (id, patch) => mutate(() => moiGiven.update(id, patch)).then(() => undefined),
      removeMoiGiven: (id) => mutate(() => moiGiven.remove(id)),

      addExpense: (input) => mutate(() => expenses.create(input)).then((e) => e.id),
      editExpense: (id, patch) => mutate(() => expenses.update(id, patch)).then(() => undefined),
      removeExpense: (id) => mutate(() => expenses.remove(id)),

      addFamilyMember: (input) => mutate(() => familyMembers.create(input)).then((m) => m.id),
      setMemberRole: (id, role) =>
        mutate(() => familyMembers.setRole(id, role)).then(() => undefined),
      removeFamilyMember: (id) => mutate(() => familyMembers.remove(id)),

      addPersonEvent: (input) => mutate(() => functions.createPersonEvent(input)).then((e) => e.id),
      removePersonEvent: (id) => mutate(() => functions.removePersonEvent(id)),
      saveProfile: (patch) => mutate(() => settings.updateProfile(patch)).then(() => undefined),
      saveSettings: (patch) => mutate(() => settings.updateSettings(patch)).then(() => undefined),
      resetDemoData: () => mutate(() => settings.resetDemoData()),
      restoreBackup: (json) => mutate(() => settings.restoreBackup(json)),
    };
  }, [data, loading, error, repositories, load, mutate, online, showingCached, cachedAt]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside <AppDataProvider>.');
  return ctx;
}

/** Convenience hook for screens that only read. */
export function useDataset(): Dataset {
  return useAppData().data;
}
