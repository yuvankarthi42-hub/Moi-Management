/**
 * Sign-in, expressed as one async port.
 *
 * Deliberately separate from `DataSource`: moi records are the household's
 * books, an account is who is holding the phone. Pointing the app at a real
 * backend means writing one more `AuthSource` and changing a single line in
 * `src/auth/index.ts` — no screen changes.
 */

export interface Account {
  id: string;
  name: string;
  /** Dialling code including the plus, e.g. "+91". */
  countryCode: string;
  /** National number, digits only — no code, no spaces. */
  phone: string;
}

/** What the sign-up form collects. The PIN is never read back out. */
export interface SignUpInput {
  name: string;
  countryCode: string;
  phone: string;
  pin: string;
}

export interface SignInInput {
  countryCode: string;
  phone: string;
  pin: string;
}

export interface AuthSource {
  /** Called once at startup, before `currentAccount`. */
  init(): Promise<void>;
  /** The signed-in account, or undefined. Survives a restart. */
  currentAccount(): Promise<Account | undefined>;
  signUp(input: SignUpInput): Promise<Account>;
  signIn(input: SignInInput): Promise<Account>;
  signOut(): Promise<void>;
}

/** A sign-in that failed for a reason worth showing the user. */
export class AuthError extends Error {
  constructor(message: string, readonly field?: 'name' | 'phone' | 'pin') {
    super(message);
    this.name = 'AuthError';
  }
}

/** "+91" + "9876543210" → "+919876543210", the key an account is stored under. */
export function fullNumber(countryCode: string, phone: string): string {
  return `${countryCode}${phone.replace(/\D/g, '')}`;
}
