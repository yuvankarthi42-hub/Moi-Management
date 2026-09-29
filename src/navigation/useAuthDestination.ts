import { useAuth } from '../auth';
import { useAppData } from '../store/AppDataProvider';

export type AuthDestination = 'loading' | 'welcome' | 'phone' | 'home';

/**
 * The decision table on its own, so it can be tested without mounting a
 * screen. `useAuthDestination` below is the thin hook wrapper every screen
 * actually calls.
 */
export function authDestination(state: {
  authLoading: boolean;
  hasAccount: boolean;
  needsPhone: boolean;
  dataLoading: boolean;
  dataError: boolean;
}): AuthDestination {
  if (state.authLoading) return 'loading';
  if (!state.hasAccount) return 'welcome';
  if (state.needsPhone) return 'phone';
  // A load failure is shown in place on whichever screen is already mounted
  // rather than bounced to a different one, so 'loading' also covers it —
  // `app/index.tsx` is the one screen that renders that error.
  if (state.dataLoading || state.dataError) return 'loading';
  return 'home';
}

/**
 * Where the app belongs right now, given who is signed in.
 *
 *   'loading' — still finding out (session restoring, or the dataset loading)
 *   'welcome' — no account: needs to sign in
 *   'phone'   — signed in, but `users.phone` is still NULL
 *   'home'    — signed in, has a number, dataset is in memory
 *
 * This is the single source of truth for that decision. It used to live only
 * in `app/index.tsx`, on the theory that routing happens once at launch and
 * every screen after that is reached by *this* code choosing to send you
 * there. That held for an in-app navigation, but not for two real paths:
 *
 *  - Google sign-in is a redirect, not a popup (see
 *    `FirebaseAuthSource.signInWithGoogle`): the browser leaves the app
 *    entirely and comes back as a **fresh page load at the URL it left from**
 *    — `/welcome`, since that is the only screen that starts a sign-in. That
 *    reload mounts `app/welcome.tsx` directly; `app/index.tsx` is never
 *    involved, so its redirect never runs. Sign-in had completed — the
 *    `users` row was there — and the screen just never noticed.
 *  - Saving the phone number on `/auth/phone` updates the account in place,
 *    on the same screen, with no navigation of any kind to trigger it — so
 *    even *within* one continuous session, nothing was watching for the
 *    account changing under a screen that was mounted for a different reason.
 *
 * The fix is not a new special case for the redirect, because the failure
 * mode is general: any screen that can be the one you land on has to be able
 * to correct course on its own, not assume a router screen upstream already
 * decided and will keep deciding. So this hook is called from `app/index.tsx`
 * *and* from `app/welcome.tsx` and `app/auth/phone.tsx` — each one redirects
 * away the moment this says its own screen is not the answer.
 */
export function useAuthDestination(): AuthDestination {
  const { account, loading: authLoading, needsPhone } = useAuth();
  const { loading: dataLoading, error } = useAppData();

  return authDestination({
    authLoading,
    hasAccount: !!account,
    needsPhone,
    dataLoading,
    dataError: !!error,
  });
}
