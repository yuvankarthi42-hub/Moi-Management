import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Dataset } from '../domain/models';

/**
 * The last snapshot fetched from the database, so the app can be read offline.
 *
 * Two rules shape this, and both matter:
 *
 *  - **Only fetched data is cached.** Nothing written by the app is put here
 *    directly. A mutation goes to the database, the snapshot is re-fetched, and
 *    it is that fetch which is cached — so the cache can never hold a record
 *    the database does not have.
 *  - **It is keyed by user id.** A shared cache would show the previous
 *    account's books to the next person to sign in on the same phone, which is
 *    the isolation the whole schema exists to guarantee.
 *
 * It is a convenience, never a source of truth: any read can come back empty
 * (a private window, cleared site data, a first run) and the app has to render
 * correctly when it does.
 */

const VERSION = 1;
const PREFIX = `moi-manager/cache/v${VERSION}/`;

interface Envelope {
  fetchedAt: string;
  dataset: Dataset;
}

const keyFor = (userId: string): string => `${PREFIX}${userId}`;

export async function saveSnapshot(userId: string, dataset: Dataset): Promise<void> {
  try {
    const envelope: Envelope = { fetchedAt: new Date().toISOString(), dataset };
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(envelope));
  } catch {
    // A cache that cannot be written is a lost convenience, not a failure:
    // the app has the data in memory and the database still has it.
  }
}

export async function readSnapshot(
  userId: string,
): Promise<{ dataset: Dataset; fetchedAt: string } | undefined> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return undefined;
    const envelope = JSON.parse(raw) as Envelope;
    if (!envelope?.dataset?.people) return undefined;
    return { dataset: envelope.dataset, fetchedAt: envelope.fetchedAt };
  } catch {
    return undefined;
  }
}

/** Called on sign-out, so the next account on this phone starts clean. */
export async function clearSnapshot(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId));
  } catch {
    // Nothing to recover from; the key is scoped to a user either way.
  }
}
