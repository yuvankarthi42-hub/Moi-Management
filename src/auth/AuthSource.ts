/**
 * Sign-in, expressed as one async port.
 *
 * Deliberately separate from `DataSource`: moi records are the household's
 * books, an account is who is holding the phone.
 *
 * Google is the only way in. There is no password for the app to hold, and no
 * PIN — which also means there is nothing here to hash, store or leak. What
 * Google does not supply is the mobile number, so that is collected once on a
 * screen of its own after the first sign-in.
 */

export interface Account {
  /** Firebase UID. The same value scopes every row in the database. */
  id: string;
  name: string;
  email?: string;
  /** Google's avatar URL, not a file in our own storage. */
  photoUri?: string;
  /** Dialling code including the plus, e.g. "+91". Absent until collected. */
  countryCode?: string;
  /** National number, digits only. Absent until collected. */
  phone?: string;
}

/** True while the account still owes us a mobile number. */
export function needsPhone(account: Account | undefined): boolean {
  return !!account && !account.phone;
}

export interface AuthSource {
  /** Called once at startup, before `currentAccount`. */
  init(): Promise<void>;
  /** The signed-in account, or undefined. Survives a restart. */
  currentAccount(): Promise<Account | undefined>;
  /** Opens Google and returns the account it produced. */
  signInWithGoogle(): Promise<Account>;
  /** Stores the number collected on the phone screen. */
  savePhone(countryCode: string, phone: string): Promise<Account>;
  signOut(): Promise<void>;
  /**
   * A fresh Firebase ID token, for the production API to verify.
   *
   * The server derives the user id from this token's claims and refuses to
   * take one from the request body — which is the only arrangement in which a
   * client cannot ask for somebody else's rows.
   */
  idToken(): Promise<string | undefined>;
  /** Notifies when Firebase restores or drops a session. Returns an unsubscribe. */
  onChange(listener: (account: Account | undefined) => void): () => void;
}

/** A sign-in that failed for a reason worth showing the user. */
export class AuthError extends Error {
  constructor(message: string, readonly field?: 'phone' | 'google') {
    super(message);
    this.name = 'AuthError';
  }
}

/** "+91" + "9876543210" → "+919876543210". */
export function fullNumber(countryCode: string, phone: string): string {
  return `${countryCode}${phone.replace(/\D/g, '')}`;
}
