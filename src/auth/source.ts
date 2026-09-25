import type { AuthSource } from './AuthSource';
import { MockAuthSource } from './MockAuthSource';

/**
 * Composition root for sign-in.
 *
 * This is the single place that decides *where accounts live*. Today it is the
 * AsyncStorage-backed mock; pointing the app at a real backend means writing
 * one more `AuthSource` and changing the line below — no screen changes.
 *
 *   function createAuthSource(): AuthSource {
 *     return new ApiAuthSource(baseUrl);
 *   }
 *
 * It lives here rather than in `index.ts` so `AuthProvider` can reach it
 * without importing the barrel that exports the provider itself — that pair
 * of imports is a require cycle, and a cycle can hand back `undefined` at
 * module-init time.
 */
function createAuthSource(): AuthSource {
  return new MockAuthSource();
}

let cached: AuthSource | undefined;

export function getAuthSource(): AuthSource {
  if (!cached) cached = createAuthSource();
  return cached;
}
