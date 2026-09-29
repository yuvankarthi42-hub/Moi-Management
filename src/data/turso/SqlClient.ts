import { createClient, type Client, type InValue } from '@libsql/client/web';

import { reportReachable } from '../connectivity';

/** One SQL statement and its bound arguments. Arguments are never inlined. */
export interface Statement {
  sql: string;
  args?: InValue[];
}

export interface SqlRow {
  [column: string]: string | number | null;
}

/**
 * The narrow seam between the data source and wherever SQL actually runs.
 *
 * Two implementations exist because a client-side app cannot safely hold a
 * read-write database token: anyone can read it out of the shipped JavaScript
 * and reach every row in the database, which is precisely the isolation the
 * app is supposed to guarantee. So:
 *
 *   `DirectSqlClient` opens libSQL from the app. Local verification only.
 *   `ApiSqlClient`    posts to a server that holds the token. Production.
 *
 * Both satisfy this interface, so `TursoDataSource` is written once and the
 * choice is one environment variable — not a rewrite.
 */
export interface SqlClient {
  /** Runs one statement and returns its rows (empty for a write). */
  query(statement: Statement): Promise<SqlRow[]>;
  /** Runs several statements atomically — all of them, or none. */
  transaction(statements: Statement[]): Promise<void>;
  /** True when the last call reached the backend. */
  readonly online: boolean;
}

/** Raised when a statement could not reach the database at all. */
export class OfflineError extends Error {
  constructor(message = 'No connection to the database.') {
    super(message);
    this.name = 'OfflineError';
  }
}

function isNetworkFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /network|fetch|Failed to fetch|ENOTFOUND|ECONNREFUSED|timeout|offline/i.test(message);
}

/**
 * Talks to Turso directly from the app.
 *
 * `@libsql/client/web` is the fetch-based build: it works in a browser and in
 * React Native, where the Node build's sockets do not exist.
 */
export class DirectSqlClient implements SqlClient {
  private client: Client;
  private reachable = true;
  /** Foreign keys are off by default in libSQL, so no CASCADE would fire. */
  private pragma: Promise<void> | undefined;

  constructor(url: string, authToken: string) {
    if (!url) throw new Error('EXPO_PUBLIC_TURSO_URL is not set.');
    if (!authToken) throw new Error('EXPO_PUBLIC_TURSO_TOKEN_DEV_ONLY is not set.');
    this.client = createClient({ url, authToken });
  }

  get online(): boolean {
    return this.reachable;
  }

  private ready(): Promise<void> {
    this.pragma ??= this.client.execute('PRAGMA foreign_keys = ON').then(() => undefined);
    return this.pragma;
  }

  async query({ sql, args = [] }: Statement): Promise<SqlRow[]> {
    await this.ready();
    try {
      const result = await this.client.execute({ sql, args });
      this.reachable = true;
      reportReachable(true);
      return result.rows as unknown as SqlRow[];
    } catch (error) {
      if (isNetworkFailure(error)) {
        this.reachable = false;
        reportReachable(false);
        throw new OfflineError();
      }
      throw error;
    }
  }

  async transaction(statements: Statement[]): Promise<void> {
    if (statements.length === 0) return;
    await this.ready();
    try {
      await this.client.batch(
        statements.map(({ sql, args = [] }) => ({ sql, args })),
        'write',
      );
      this.reachable = true;
      reportReachable(true);
    } catch (error) {
      if (isNetworkFailure(error)) {
        this.reachable = false;
        reportReachable(false);
        throw new OfflineError();
      }
      throw error;
    }
  }
}

/**
 * Talks to a server that holds the database token.
 *
 * The production path. The server verifies the Firebase ID token, derives the
 * user id from its claims, and refuses to take one from the request — which is
 * the only arrangement where a client cannot ask for another user's rows.
 */
export class ApiSqlClient implements SqlClient {
  private reachable = true;

  constructor(
    private readonly baseUrl: string,
    /** Supplies a fresh Firebase ID token for each request. */
    private readonly idToken: () => Promise<string | undefined>,
  ) {
    if (!baseUrl) throw new Error('EXPO_PUBLIC_API_URL is not set.');
  }

  get online(): boolean {
    return this.reachable;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const token = await this.idToken();
    if (!token) throw new Error('Not signed in.');
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      this.reachable = true;
      reportReachable(true);
    } catch {
      this.reachable = false;
      reportReachable(false);
      throw new OfflineError();
    }
    if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
    return response.json();
  }

  async query(statement: Statement): Promise<SqlRow[]> {
    const body = (await this.post('/query', statement)) as { rows?: SqlRow[] };
    return body.rows ?? [];
  }

  async transaction(statements: Statement[]): Promise<void> {
    await this.post('/transaction', { statements });
  }
}
