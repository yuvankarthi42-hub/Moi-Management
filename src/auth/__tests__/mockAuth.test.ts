import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthError, fullNumber } from '../AuthSource';
import { MockAuthSource } from '../MockAuthSource';

const SIGN_UP = {
  name: 'Karthick',
  countryCode: '+91',
  phone: '9876543210',
  pin: '1234',
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

/** A fresh source, as a cold start would build it. */
function source() {
  return new MockAuthSource();
}

describe('full number', () => {
  it('joins the dialling code to the national number', () => {
    expect(fullNumber('+91', '98765 43210')).toBe('+919876543210');
  });
});

describe('sign up', () => {
  it('creates an account and signs it in', async () => {
    const auth = source();
    const account = await auth.signUp(SIGN_UP);
    expect(account.name).toBe('Karthick');
    expect(account.countryCode).toBe('+91');
    expect(await auth.currentAccount()).toMatchObject({ id: account.id });
  });

  it('never hands the pin back out', async () => {
    const account = await source().signUp(SIGN_UP);
    expect(account).not.toHaveProperty('pin');
  });

  it('refuses a number that already has an account', async () => {
    const auth = source();
    await auth.signUp(SIGN_UP);
    await expect(auth.signUp({ ...SIGN_UP, name: 'Someone else' })).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it('treats the same number under a different code as a different account', async () => {
    const auth = source();
    await auth.signUp(SIGN_UP);
    const other = await auth.signUp({ ...SIGN_UP, countryCode: '+65', name: 'Anna' });
    expect(other.name).toBe('Anna');
  });

  it('rejects a short number and a pin that is not four digits', async () => {
    const auth = source();
    await expect(auth.signUp({ ...SIGN_UP, phone: '123' })).rejects.toThrow(/valid mobile/i);
    await expect(auth.signUp({ ...SIGN_UP, pin: '12' })).rejects.toThrow(/4 digits/i);
    await expect(auth.signUp({ ...SIGN_UP, name: '   ' })).rejects.toThrow(/name/i);
  });
});

describe('sign in', () => {
  it('accepts the number and pin it was created with', async () => {
    const auth = source();
    const created = await auth.signUp(SIGN_UP);
    await auth.signOut();
    const back = await auth.signIn({ countryCode: '+91', phone: '9876543210', pin: '1234' });
    expect(back.id).toBe(created.id);
  });

  it('ignores spacing in the typed number', async () => {
    const auth = source();
    await auth.signUp(SIGN_UP);
    await auth.signOut();
    await expect(
      auth.signIn({ countryCode: '+91', phone: '98765 43210', pin: '1234' }),
    ).resolves.toBeDefined();
  });

  it('refuses a wrong pin, and an unknown number, with the same message', async () => {
    const auth = source();
    await auth.signUp(SIGN_UP);
    await auth.signOut();

    const wrongPin = await auth
      .signIn({ countryCode: '+91', phone: '9876543210', pin: '9999' })
      .catch((e: AuthError) => e.message);
    const unknown = await auth
      .signIn({ countryCode: '+91', phone: '9000000000', pin: '1234' })
      .catch((e: AuthError) => e.message);

    expect(wrongPin).toBe(unknown);
  });
});

describe('session', () => {
  it('survives a restart', async () => {
    const created = await source().signUp(SIGN_UP);
    // A second instance reads the same AsyncStorage, as a relaunch would.
    expect(await source().currentAccount()).toMatchObject({ id: created.id });
  });

  it('is gone after signing out', async () => {
    const auth = source();
    await auth.signUp(SIGN_UP);
    await auth.signOut();
    expect(await auth.currentAccount()).toBeUndefined();
    expect(await source().currentAccount()).toBeUndefined();
  });

  it('starts signed out rather than throwing when the store is corrupt', async () => {
    await AsyncStorage.setItem('moi-manager/auth/v1', 'not json');
    expect(await source().currentAccount()).toBeUndefined();
  });
});
