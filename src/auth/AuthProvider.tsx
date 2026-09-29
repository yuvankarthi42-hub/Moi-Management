import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import type { Account } from './AuthSource';
import { getAuthSource } from './source';

interface AuthValue {
  account?: Account;
  /** True until the stored session has been read; routing waits on this. */
  loading: boolean;
  /** Signed in, but has not given a mobile number yet. */
  needsPhone: boolean;
  signInWithGoogle: () => Promise<void>;
  savePhone: (countryCode: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

/**
 * Holds the signed-in account.
 *
 * Kept outside `AppDataProvider` rather than folded into it: the dataset is the
 * household's books and loads the same way whoever is holding the phone, while
 * this decides which screens they get to see at all.
 *
 * It also subscribes to Firebase rather than only reading once, so a session
 * that expires or is signed out in another tab drops this app back to the
 * welcome screen instead of leaving it on a page it can no longer load.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const source = useMemo(() => getAuthSource(), []);
  const [account, setAccount] = useState<Account | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        await source.init();
        const current = await source.currentAccount();
        if (!cancelled) setAccount(current);
        unsubscribe = source.onChange((next) => {
          if (!cancelled) setAccount(next);
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [source]);

  // Errors are deliberately not caught here: the screens show them where they
  // belong, which needs the AuthError itself.
  const signInWithGoogle = useCallback(async () => {
    setAccount(await source.signInWithGoogle());
  }, [source]);

  const savePhone = useCallback(
    async (countryCode: string, phone: string) => {
      setAccount(await source.savePhone(countryCode, phone));
    },
    [source],
  );

  const signOut = useCallback(async () => {
    await source.signOut();
    setAccount(undefined);
  }, [source]);

  const value = useMemo<AuthValue>(
    () => ({
      account,
      loading,
      needsPhone: !!account && !account.phone,
      signInWithGoogle,
      savePhone,
      signOut,
    }),
    [account, loading, signInWithGoogle, savePhone, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
