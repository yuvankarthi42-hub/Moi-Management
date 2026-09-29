import { ApiSqlClient, DirectSqlClient, type SqlClient } from './SqlClient';

/**
 * Builds the one SQL client the app uses, from the environment.
 *
 * It lives in its own module because two composition roots need it — the data
 * layer, for the household's records, and the auth layer, for the `users` row
 * that sign-in creates. Importing it from either would otherwise mean the two
 * import each other.
 */

export type DataMode = 'direct' | 'api';

export function dataMode(): DataMode {
  return process.env.EXPO_PUBLIC_DATA_MODE === 'api' ? 'api' : 'direct';
}

let cached: SqlClient | undefined;

/**
 * `direct` opens libSQL from the app, which means the read-write token is in
 * the shipped bundle where any user can read it out and reach every row in the
 * database. That is fine on a laptop and unacceptable in production, so it is
 * for local verification only; `api` is the mode that ships.
 */
export function getSqlClient(idToken: () => Promise<string | undefined>): SqlClient {
  if (cached) return cached;
  cached =
    dataMode() === 'api'
      ? new ApiSqlClient(process.env.EXPO_PUBLIC_API_URL ?? '', idToken)
      : new DirectSqlClient(
          process.env.EXPO_PUBLIC_TURSO_URL ?? '',
          process.env.EXPO_PUBLIC_TURSO_TOKEN_DEV_ONLY ?? '',
        );
  return cached;
}
