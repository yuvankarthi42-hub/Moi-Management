import { getSqlClient } from '../data/turso/client';
import { UserAccountStore } from '../data/turso/UserAccountStore';
import type { AuthSource } from './AuthSource';
import { firebaseAuth } from './firebase';
import { FirebaseAuthSource } from './FirebaseAuthSource';

/**
 * Composition root for sign-in.
 *
 * The single place that decides where accounts live: Firebase for identity,
 * the `users` row in Turso for the mobile number.
 *
 * It lives here rather than in `index.ts` so `AuthProvider` can reach it
 * without importing the barrel that exports the provider itself — that pair of
 * imports is a require cycle, and a cycle can hand back `undefined` at
 * module-init time.
 */
let cached: AuthSource | undefined;

export function getAuthSource(): AuthSource {
  if (!cached) {
    // The client needs a token getter and the auth source needs the client, so
    // the getter reads back through the cached instance once it exists.
    const sql = getSqlClient(async () => cached?.idToken());
    cached = new FirebaseAuthSource(firebaseAuth, new UserAccountStore(sql));
  }
  return cached;
}
