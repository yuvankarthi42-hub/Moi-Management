import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';

import { getRepositories, type Repositories } from '../data';
import type {
  NewExpense, NewFamily, NewFamilyMember, NewFunction, NewGuest, NewMoiEntry, NewPerson,
  NewPersonEvent,
} from '../data/DataSource';
import {
  EMPTY_DATASET, type AppSettings, type Dataset, type FamilyRole, type ID,
  type RsvpStatus, type UserProfile,
} from '../domain/models';

/**
 * Loads the whole dataset into memory once, then hands screens a snapshot plus
 * the mutations that change it.
 *
 * Reloading everything after a write is deliberate: the dataset is small, and
 * it guarantees every screen (home totals, reports, person history) agrees
 * after any edit, with no cache-invalidation logic to get wrong.
 */

interface AppDataValue {
  data: Dataset;
  loading: boolean;
  error?: string;
  repositories: Repositories;

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

  // Expenses
  addExpense: (input: NewExpense) => Promise<string>;
  editExpense: (id: ID, patch: Partial<NewExpense>) => Promise<void>;
  removeExpense: (id: ID) => Promise<void>;

  // Guests
  addGuest: (input: NewGuest) => Promise<string>;
  editGuest: (id: ID, patch: Partial<NewGuest>) => Promise<void>;
  removeGuest: (id: ID) => Promise<void>;
  setGuestRsvp: (id: ID, status: RsvpStatus) => Promise<void>;
  setGuestCheckedIn: (id: ID, checkedIn: boolean) => Promise<void>;
  addGuestsBulk: (inputs: NewGuest[]) => Promise<{ added: number; skipped: number }>;

  // Family collaboration
  addFamilyMember: (input: NewFamilyMember) => Promise<string>;
  setMemberRole: (id: ID, role: FamilyRole) => Promise<void>;
  removeFamilyMember: (id: ID) => Promise<void>;

  // Guest-hosted events
  addPersonEvent: (input: NewPersonEvent) => Promise<string>;
  removePersonEvent: (id: ID) => Promise<void>;
  markMoiReturned: (eventId: ID, amount: number) => Promise<void>;

  // Profile & settings
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;
  saveSettings: (patch: Partial<AppSettings>) => Promise<void>;
  resetDemoData: () => Promise<void>;
  restoreBackup: (json: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | undefined>(undefined);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const repositories = useMemo(() => getRepositories(), []);
  const [data, setData] = useState<Dataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const mounted = useRef(true);

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
      people, families, functions, moiEntries, expenses, guests, personEvents,
      familyMembers, profile, settings,
    ] = await Promise.all([
      source.listPeople(),
      source.listFamilies(),
      source.listFunctions(),
      source.listMoiEntries(),
      source.listExpenses(),
      source.listGuests(),
      source.listPersonEvents(),
      source.listFamilyMembers(),
      source.getProfile(),
      source.getSettings(),
    ]);
    if (!mounted.current) return;
    setData({
      people, families, functions, moiEntries, expenses, guests, personEvents,
      familyMembers, profile, settings,
    });
  }, [repositories]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await repositories.source.init();
        if (!cancelled) await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [repositories, load]);

  /**
   * Runs a mutation and refreshes the snapshot. Errors propagate so the calling
   * screen can show them inline — this layer only guarantees consistency.
   */
  const mutate = useCallback(
    async <T,>(op: () => Promise<T>): Promise<T> => {
      const result = await op();
      await load();
      return result;
    },
    [load],
  );

  const value = useMemo<AppDataValue>(() => {
    const {
      people, functions, moi, expenses, guests, familyMembers, settings,
    } = repositories;
    return {
      data,
      loading,
      error,
      repositories,
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

      addExpense: (input) => mutate(() => expenses.create(input)).then((e) => e.id),
      editExpense: (id, patch) => mutate(() => expenses.update(id, patch)).then(() => undefined),
      removeExpense: (id) => mutate(() => expenses.remove(id)),

      addGuest: (input) => mutate(() => guests.create(input)).then((g) => g.id),
      editGuest: (id, patch) => mutate(() => guests.update(id, patch)).then(() => undefined),
      removeGuest: (id) => mutate(() => guests.remove(id)),
      setGuestRsvp: (id, status) => mutate(() => guests.setRsvp(id, status)).then(() => undefined),
      setGuestCheckedIn: (id, checkedIn) =>
        mutate(() => guests.setCheckedIn(id, checkedIn)).then(() => undefined),
      addGuestsBulk: (inputs) => mutate(() => guests.bulkCreate(inputs)),

      addFamilyMember: (input) => mutate(() => familyMembers.create(input)).then((m) => m.id),
      setMemberRole: (id, role) =>
        mutate(() => familyMembers.setRole(id, role)).then(() => undefined),
      removeFamilyMember: (id) => mutate(() => familyMembers.remove(id)),

      addPersonEvent: (input) => mutate(() => functions.createPersonEvent(input)).then((e) => e.id),
      removePersonEvent: (id) => mutate(() => functions.removePersonEvent(id)),
      markMoiReturned: (eventId, amount) =>
        mutate(() => functions.markReturned(eventId, amount)).then(() => undefined),

      saveProfile: (patch) => mutate(() => settings.updateProfile(patch)).then(() => undefined),
      saveSettings: (patch) => mutate(() => settings.updateSettings(patch)).then(() => undefined),
      resetDemoData: () => mutate(() => settings.resetDemoData()),
      restoreBackup: (json) => mutate(() => settings.restoreBackup(json)),
    };
  }, [data, loading, error, repositories, load, mutate]);

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
