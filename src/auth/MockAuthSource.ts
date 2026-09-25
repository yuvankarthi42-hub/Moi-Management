import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AuthError,
  fullNumber,
  type Account,
  type AuthSource,
  type SignInInput,
  type SignUpInput,
} from './AuthSource';

const STORAGE_KEY = 'moi-manager/auth/v1';

interface StoredAccount extends Account {
  /**
   * Stored as typed. This is a mock standing in for a backend that would hash
   * it — nothing here should be reused once a real AuthSource exists.
   */
  pin: string;
}

interface Store {
  accounts: StoredAccount[];
  /** Id of the signed-in account, so a restart stays signed in. */
  sessionId?: string;
}

const EMPTY: Store = { accounts: [] };

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Drops the pin before an account leaves this module. */
function publicAccount({ pin: _pin, ...account }: StoredAccount): Account {
  return account;
}

/** Accounts kept on the device, so the flow works with no network at all. */
export class MockAuthSource implements AuthSource {
  private store: Store = EMPTY;
  private ready = false;

  async init(): Promise<void> {
    if (this.ready) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<Store>) : undefined;
      this.store = { accounts: parsed?.accounts ?? [], sessionId: parsed?.sessionId };
    } catch {
      // A corrupt store should not lock the user out — start fresh instead.
      this.store = EMPTY;
    }
    this.ready = true;
  }

  private async persist(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
  }

  async currentAccount(): Promise<Account | undefined> {
    await this.init();
    const found = this.store.accounts.find((a) => a.id === this.store.sessionId);
    return found ? publicAccount(found) : undefined;
  }

  async signUp(input: SignUpInput): Promise<Account> {
    await this.init();

    const name = input.name.trim();
    const phone = digits(input.phone);
    const pin = digits(input.pin);

    if (!name) throw new AuthError('Enter your name.', 'name');
    if (phone.length < 6) throw new AuthError('Enter a valid mobile number.', 'phone');
    if (pin.length !== 4) throw new AuthError('Your PIN must be 4 digits.', 'pin');

    const number = fullNumber(input.countryCode, phone);
    if (this.store.accounts.some((a) => fullNumber(a.countryCode, a.phone) === number)) {
      throw new AuthError('That mobile number already has an account. Sign in instead.', 'phone');
    }

    const account: StoredAccount = {
      id: `acc_${Date.now().toString(36)}`,
      name,
      countryCode: input.countryCode,
      phone,
      pin,
    };
    this.store.accounts.push(account);
    this.store.sessionId = account.id;
    await this.persist();
    return publicAccount(account);
  }

  async signIn(input: SignInInput): Promise<Account> {
    await this.init();

    const phone = digits(input.phone);
    const number = fullNumber(input.countryCode, phone);
    const account = this.store.accounts.find(
      (a) => fullNumber(a.countryCode, a.phone) === number,
    );

    // Same message either way: which numbers have accounts is not worth telling
    // whoever is holding the phone.
    if (!account || account.pin !== digits(input.pin)) {
      throw new AuthError('That mobile number and PIN do not match.', 'pin');
    }

    this.store.sessionId = account.id;
    await this.persist();
    return publicAccount(account);
  }

  async signOut(): Promise<void> {
    await this.init();
    this.store.sessionId = undefined;
    await this.persist();
  }
}
