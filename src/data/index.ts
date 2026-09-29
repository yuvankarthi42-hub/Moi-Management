import { userScope } from '../auth/currentUser';
import { getAuthSource } from '../auth/source';
import type { DataSource } from './DataSource';
import { ExpenseRepository } from './repositories/ExpenseRepository';
import { FamilyMemberRepository } from './repositories/FamilyMemberRepository';
import { FunctionRepository } from './repositories/FunctionRepository';
import { GiftRepository } from './repositories/GiftRepository';
import { MoiGivenRepository } from './repositories/MoiGivenRepository';
import { MoiRepository } from './repositories/MoiRepository';
import { PeopleRepository } from './repositories/PeopleRepository';
import { SettingsRepository } from './repositories/SettingsRepository';
import { getSqlClient } from './turso/client';
import { TursoDataSource } from './turso/TursoDataSource';

/**
 * Composition root.
 *
 * The single place that decides *where the data lives*. It is Turso, reached
 * either directly or through an API — `EXPO_PUBLIC_DATA_MODE` picks which, and
 * `src/data/turso/client.ts` explains why there are two.
 *
 * The user id is not passed in: it comes from `userScope`, which the auth layer
 * fills in when Firebase hands over a session. That indirection is what lets
 * this graph be built once at module load, before anybody has signed in.
 */
function createDataSource(): DataSource {
  const sql = getSqlClient(async () => getAuthSource().idToken());
  return new TursoDataSource(sql, userScope);
}

export interface Repositories {
  source: DataSource;
  people: PeopleRepository;
  functions: FunctionRepository;
  moi: MoiRepository;
  moiGiven: MoiGivenRepository;
  gifts: GiftRepository;
  expenses: ExpenseRepository;
  familyMembers: FamilyMemberRepository;
  settings: SettingsRepository;
}

let cached: Repositories | undefined;

/** Lazily builds — and then reuses — the repository graph. */
export function getRepositories(): Repositories {
  if (!cached) {
    const source = createDataSource();
    cached = {
      source,
      people: new PeopleRepository(source),
      functions: new FunctionRepository(source),
      moi: new MoiRepository(source),
      moiGiven: new MoiGivenRepository(source),
      gifts: new GiftRepository(source),
      expenses: new ExpenseRepository(source),
      familyMembers: new FamilyMemberRepository(source),
      settings: new SettingsRepository(source),
    };
  }
  return cached;
}

export type { DataSource, BackupPayload } from './DataSource';
export { ValidationError, NotFoundError } from './repositories/errors';
