import type { DataSource } from './DataSource';
import { MockDataSource } from './mock/MockDataSource';
import { ExpenseRepository } from './repositories/ExpenseRepository';
import { FamilyMemberRepository } from './repositories/FamilyMemberRepository';
import { FunctionRepository } from './repositories/FunctionRepository';
import { MoiGivenRepository } from './repositories/MoiGivenRepository';
import { MoiRepository } from './repositories/MoiRepository';
import { PeopleRepository } from './repositories/PeopleRepository';
import { SettingsRepository } from './repositories/SettingsRepository';

/**
 * Composition root.
 *
 * This is the single place that decides *where the data lives*. Today it is the
 * AsyncStorage-backed mock; pointing the app at SQLite or a REST API means
 * writing one more `DataSource` and changing the line below — no repository,
 * selector or screen changes.
 *
 *   const source: DataSource = new ApiDataSource(baseUrl, token);
 */
function createDataSource(): DataSource {
  return new MockDataSource();
}

export interface Repositories {
  source: DataSource;
  people: PeopleRepository;
  functions: FunctionRepository;
  moi: MoiRepository;
  moiGiven: MoiGivenRepository;
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
      expenses: new ExpenseRepository(source),
      familyMembers: new FamilyMemberRepository(source),
      settings: new SettingsRepository(source),
    };
  }
  return cached;
}

export type { DataSource, BackupPayload } from './DataSource';
export { ValidationError, NotFoundError } from './repositories/errors';
