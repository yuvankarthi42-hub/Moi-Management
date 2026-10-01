import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whether this device has recorded the user's agreement to the Terms &
 * Conditions and Privacy Policy.
 *
 * Per-device, not per-account. The agreement is between the person and the
 * app, so once the box has been ticked here we do not ask again on the next
 * sign-in from the same device — even after a sign-out from the More page,
 * which is a session end, not a repudiation of the agreement.
 *
 * Clearing site data, opening the app in a private window, or installing it
 * on a new device all bring the first-time screen back, which is correct: a
 * legally-sound opt-in has to be done once per device, not once per account
 * on any device the user walks past.
 *
 * The stored shape carries a timestamp rather than a bare boolean so a future
 * migration (new Terms version, say) can decide what to do with an older
 * record without having to guess when it was recorded.
 */

const KEY = 'moi.consent.v1';

export interface ConsentRecord {
  /** ISO timestamp of when the box was ticked and sign-in completed. */
  agreedAt: string;
}

export async function readConsent(): Promise<ConsentRecord | undefined> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ConsentRecord;
    return parsed && typeof parsed.agreedAt === 'string' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function recordConsent(): Promise<void> {
  try {
    const record: ConsentRecord = { agreedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // A failed write is harmless: the next launch simply asks again, which
    // is the same side of safe as the original behaviour.
  }
}

/** Exposed for tests and for a future "wipe this device" flow. */
export async function clearConsent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing to recover from.
  }
}
