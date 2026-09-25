import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getAuthSource } from './source';
import type { Account, SignInInput, SignUpInput } from './AuthSource';

interface AuthValue {
  account?: Account;
  /** True until the stored session has been read; routing waits on this. */
  loading: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

/**
 * Holds the signed-in account.
 *
 * Kept outside `AppDataProvider` rather than folded into it: the dataset is the
 * household's books and loads the same way whoever is holding the phone, while
 * this decides which screens they get to see at all.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const source = useMemo(() => getAuthSource(), []);
  const [account, setAccount] = useState<Account | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await source.init();
        const current = await source.currentAccount();
        if (!cancelled) setAccount(current);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  // Errors are deliberately not caught here: the forms show them against the
  // field that caused them, which needs the AuthError itself.
  const signUp = useCallback(
    async (input: SignUpInput) => setAccount(await source.signUp(input)),
    [source],
  );

  const signIn = useCallback(
    async (input: SignInInput) => setAccount(await source.signIn(input)),
    [source],
  );

  const signOut = useCallback(async () => {
    await source.signOut();
    setAccount(undefined);
  }, [source]);

  const value = useMemo<AuthValue>(
    () => ({ account, loading, signUp, signIn, signOut }),
    [account, loading, signUp, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
