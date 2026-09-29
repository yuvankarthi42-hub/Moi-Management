import { authDestination } from '../useAuthDestination';

const base = {
  authLoading: false,
  hasAccount: false,
  needsPhone: false,
  dataLoading: false,
  dataError: false,
};

describe('authDestination', () => {
  it('waits while the session is still being restored', () => {
    expect(authDestination({ ...base, authLoading: true })).toBe('loading');
    // Even a signed-in-looking state defers to authLoading — the session
    // itself has not been confirmed yet.
    expect(authDestination({ ...base, authLoading: true, hasAccount: true })).toBe('loading');
  });

  it('sends a signed-out phone to welcome', () => {
    expect(authDestination({ ...base, hasAccount: false })).toBe('welcome');
  });

  it('asks for a phone number before anything else', () => {
    expect(authDestination({ ...base, hasAccount: true, needsPhone: true })).toBe('phone');
  });

  it('waits for the dataset once signed in with a number', () => {
    expect(
      authDestination({ ...base, hasAccount: true, needsPhone: false, dataLoading: true }),
    ).toBe('loading');
  });

  it('shows the load error in place rather than bouncing to another screen', () => {
    expect(
      authDestination({ ...base, hasAccount: true, needsPhone: false, dataError: true }),
    ).toBe('loading');
  });

  it('reaches home once signed in, numbered and loaded', () => {
    expect(authDestination({ ...base, hasAccount: true, needsPhone: false })).toBe('home');
  });

  /**
   * The two bugs this hook was written to close. Both were real: signing in
   * completed (confirmed against the database) while the screen never moved,
   * because nothing was watching the account change under a screen that had
   * been mounted for a different reason.
   */
  describe('regression: a screen mounted for one reason has to notice the state moving on', () => {
    it('a completed Google redirect returns to /welcome, not /: it must resolve to phone or home, never stay at welcome', () => {
      // Sign-in just completed; Google's redirect landed the browser back on
      // /welcome directly, bypassing app/index.tsx entirely.
      const justSignedIn = { ...base, hasAccount: true, needsPhone: true };
      expect(authDestination(justSignedIn)).not.toBe('welcome');
      expect(authDestination(justSignedIn)).toBe('phone');
    });

    it('saving the phone number on /auth/phone must resolve to home, not keep asking for a phone', () => {
      // savePhone() has just filled in the number on the same mounted screen.
      const justSavedPhone = { ...base, hasAccount: true, needsPhone: false };
      expect(authDestination(justSavedPhone)).not.toBe('phone');
      expect(authDestination(justSavedPhone)).toBe('home');
    });

    it('signing out from /auth/phone must resolve to welcome, not keep showing the phone form', () => {
      const justSignedOut = { ...base, hasAccount: false };
      expect(authDestination(justSignedOut)).toBe('welcome');
    });
  });
});
