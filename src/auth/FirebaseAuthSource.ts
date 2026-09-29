import {
  GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as fbSignOut,
  type Auth, type User,
} from 'firebase/auth';
import { Platform } from 'react-native';

import type { UserAccountStore } from '../data/turso/UserAccountStore';
import { AuthError, type Account, type AuthSource } from './AuthSource';
import { setCurrentUserId } from './currentUser';

/**
 * Sign-in through Firebase, with Google as the only provider.
 *
 * Firebase owns identity; the `users` row owns the mobile number. Both are
 * reconciled here so the rest of the app sees one `Account` and never has to
 * ask which half a field came from.
 */
export class FirebaseAuthSource implements AuthSource {
  private auth: Auth | undefined;
  /** The `users` row for the signed-in uid, so `phone` survives a reload. */
  private stored: { countryCode?: string; phone?: string } = {};

  constructor(
    private readonly makeAuth: () => Auth,
    private readonly users: UserAccountStore,
  ) {}

  async init(): Promise<void> {
    this.auth = this.makeAuth();
    // Firebase restores a session asynchronously. Waiting for the first
    // callback here means routing never has to guess, and the welcome screen
    // cannot flash at someone who is already signed in.
    await new Promise<void>((resolve) => {
      const stop = onAuthStateChanged(this.auth!, () => {
        stop();
        resolve();
      });
    });
  }

  private get client(): Auth {
    if (!this.auth) this.auth = this.makeAuth();
    return this.auth;
  }

  /** Firebase's user plus what our own row knows. */
  private async toAccount(user: User): Promise<Account> {
    const row = await this.users.ensure({
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? undefined,
      photoUrl: user.photoURL ?? undefined,
    });
    this.stored = { countryCode: row.countryCode, phone: row.phone };
    setCurrentUserId(user.uid);
    return {
      id: user.uid,
      name: row.displayName ?? user.displayName ?? user.email ?? 'You',
      email: row.email || undefined,
      photoUri: row.photoUrl,
      countryCode: row.countryCode,
      phone: row.phone,
    };
  }

  async currentAccount(): Promise<Account | undefined> {
    const user = this.client.currentUser;
    if (!user) {
      setCurrentUserId(undefined);
      return undefined;
    }
    return this.toAccount(user);
  }

  /**
   * Opens Google in a popup and resolves once it closes with an account.
   *
   * This was briefly a full-page redirect instead (`signInWithRedirect`), to
   * silence a console warning: Google's own sign-in page sends
   * `Cross-Origin-Opener-Policy: same-origin`, which stops the popup from
   * closing itself after a successful sign-in and logs
   *
   *   Cross-Origin-Opener-Policy policy would block the window.close call
   *
   * That warning is real but cosmetic — confirmed by checking the database
   * immediately after a popup sign-in that logged it: the `users` row was
   * created and updated exactly when expected. The redirect flow traded that
   * cosmetic warning for something worse: on `localhost`, its return leg
   * depends on a hidden iframe relaying the result back from
   * `authDomain` (`__/auth/iframe`) across origins, which is exactly the kind
   * of cross-site storage access that browsers increasingly restrict — and it
   * has no error to show when it silently fails. Popup is the flow this app
   * has actual evidence of completing, twice, so it stays.
   */
  async signInWithGoogle(): Promise<Account> {
    if (Platform.OS !== 'web') {
      // Native needs an OAuth client id per platform, exchanged through
      // expo-auth-session for a Google ID token and then passed to
      // signInWithCredential. Those ids are not configured yet, so say so
      // plainly instead of failing somewhere deeper.
      throw new AuthError(
        'Google sign-in on iOS and Android needs the native OAuth client ids. ' +
          'Add them to Firebase and set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and ' +
          'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.',
        'google',
      );
    }
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(this.client, provider);
      return this.toAccount(result.user);
    } catch (error) {
      throw new AuthError(describeGoogleError(error), 'google');
    }
  }

  async savePhone(countryCode: string, phone: string): Promise<Account> {
    const user = this.client.currentUser;
    if (!user) throw new AuthError('You are not signed in.');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) throw new AuthError('Enter a full mobile number.', 'phone');
    try {
      const row = await this.users.savePhone(user.uid, countryCode, digits);
      this.stored = { countryCode: row.countryCode, phone: row.phone };
    } catch (error) {
      // The unique index on (phone_country, phone) is what raises this.
      if (/UNIQUE|constraint/i.test(error instanceof Error ? error.message : '')) {
        throw new AuthError('That mobile number is already used by another account.', 'phone');
      }
      throw error;
    }
    return (await this.currentAccount())!;
  }

  async signOut(): Promise<void> {
    await fbSignOut(this.client);
    this.stored = {};
    setCurrentUserId(undefined);
  }

  async idToken(): Promise<string | undefined> {
    return this.client.currentUser?.getIdToken();
  }

  onChange(listener: (account: Account | undefined) => void): () => void {
    return onAuthStateChanged(this.client, async (user) => {
      if (!user) {
        setCurrentUserId(undefined);
        listener(undefined);
        return;
      }
      listener(await this.toAccount(user));
    });
  }
}

/** Turns a Firebase error code into something worth showing on the button. */
function describeGoogleError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Sign-in was cancelled.';
  }
  if (code === 'auth/popup-blocked') {
    return 'The browser blocked the sign-in window. Allow popups and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return (
      'This address is not on the Firebase authorised domains list. Add it under ' +
      'Authentication → Settings → Authorised domains.'
    );
  }
  if (code === 'auth/network-request-failed') {
    return 'Could not reach Google. Check your connection and try again.';
  }
  return error instanceof Error ? error.message : 'Google sign-in failed.';
}
