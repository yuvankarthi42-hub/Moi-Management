import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthError, useAuth } from '../src/auth';
import { readConsent, recordConsent } from '../src/auth/consentCache';
import { BrandMark } from '../src/components/app/BrandMark';
import { GoogleSignInButton } from '../src/components/app/GoogleSignInButton';
import { T } from '../src/components/ui';
import { useAuthDestination } from '../src/navigation/useAuthDestination';
import { makeStyles, radius, safeAreaFloor, spacing, useColors } from '../src/theme';

/**
 * Landing screen — the first thing a new phone sees.
 *
 * Two layouts, chosen by whether this device has already recorded consent:
 *
 *  - **First time** (`agreed === false`): a grouped card holds the agreement
 *    checkbox, a divider, and the Google button. The button is disabled
 *    until the box is checked. On a successful sign-in the agreement is
 *    recorded, so the next launch takes the second path.
 *  - **Returning** (`agreed === true`): the checkbox is gone, the title
 *    reads "Welcome back", and the Google button is directly tappable. A
 *    passive consent line stays under the button so anyone who wants to
 *    re-read the Terms can tap through at any time.
 *
 * It is not a tab or a stack screen with a header: the gradient runs edge to
 * edge behind the status bar, so the insets are applied here rather than by
 * `Screen`.
 */
export default function WelcomeScreen() {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  const destination = useAuthDestination();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [checked, setChecked] = useState(false);
  /**
   * `undefined` while we read storage, `true`/`false` once we know. Rendering
   * the actions block before this resolves would flash the first-time card
   * at a returning user, which looks like the UI changing its mind — hold
   * the actions back for the few milliseconds the read takes.
   */
  const [agreed, setAgreed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void readConsent().then((record) => {
      if (!cancelled) setAgreed(!!record);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isReturning = agreed === true;
  const canSignIn = isReturning || checked;

  const onGoogle = async () => {
    if (!canSignIn || busy) return;
    setError(undefined);
    setBusy(true);
    try {
      await signInWithGoogle();
      // First-time path: record consent only after sign-in actually
      // succeeded. A failed or cancelled sign-in leaves the record empty,
      // so the next launch shows the first-time screen again.
      if (!isReturning) {
        await recordConsent();
        setAgreed(true);
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Sign-in failed. Try again.');
      setBusy(false);
    }
  };

  // `onGoogle` succeeding sets the account in place — the popup closes, this
  // component stays exactly as mounted, nothing navigates anywhere on its
  // own. So this screen has to notice its own state changing and send itself
  // on; nothing upstream (`app/index.tsx` included) is watching for that once
  // this one has been reached. See `useAuthDestination`.
  //
  // 'loading' is deliberately not redirected: it also covers the brief window
  // on first mount before `AuthProvider.init()` has restored any existing
  // session, which resolves to one of the other three within one render.
  if (destination === 'phone') return <Redirect href="/auth/phone" />;
  if (destination === 'home') return <Redirect href="/(tabs)" />;

  return (
    <LinearGradient colors={colors.splashGradient} style={styles.root}>
      <View
        style={[
          styles.body,
          {
            paddingTop: safeAreaFloor(insets.top, 'top', spacing.xl),
            paddingBottom: safeAreaFloor(insets.bottom, 'bottom', spacing.xl),
          },
        ]}
      >
        {/* Takes the whole space above the actions and centres the mark in it,
            so the logo sits on the screen's axis rather than near the top. */}
        <View style={styles.identity}>
          <BrandMark size={isReturning ? 248 : 180} />

          <T variant="display" tone="onPrimary" center>
            {isReturning ? 'Welcome back' : 'Moi Manager'}
          </T>
          <T variant="body" color={colors.onPrimaryMuted} center style={styles.tagline}>
            {isReturning
              ? 'Your moi book is waiting for you.'
              : 'Every moi you receive and return,\nin one place'}
          </T>
        </View>

        <View style={styles.actions}>
          {/* Hold the actions back until we know which layout to show.
              AsyncStorage resolves in under a millisecond on web and a few on
              native, so the empty space is imperceptible — but visibly
              flipping from a checkbox card to a direct button looks like the
              UI second-guessing itself, and we never want that. */}
          {agreed === undefined ? null : isReturning ? (
            <ReturningActions
              busy={busy}
              error={error}
              onGoogle={onGoogle}
              onOpenTerms={() => router.push('/legal/terms')}
              onOpenPrivacy={() => router.push('/legal/privacy')}
            />
          ) : (
            <FirstTimeActions
              busy={busy}
              checked={checked}
              onToggle={() => setChecked((v) => !v)}
              error={error}
              onGoogle={onGoogle}
              onOpenTerms={() => router.push('/legal/terms')}
              onOpenPrivacy={() => router.push('/legal/privacy')}
            />
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

/**
 * First-time: the grouped card.
 *
 * Checkbox and button live inside one bordered surface so the two read as
 * one unit of "sign-in with agreement", not as a lone box that happens to
 * sit above a lone button. The whole checkbox row is one hit target —
 * tapping the text ticks the box too, except on the Terms / Privacy words
 * themselves, which are nested `<T onPress>` spans and swallow the tap to
 * open the pages instead.
 */
function FirstTimeActions({
  busy, checked, onToggle, error, onGoogle, onOpenTerms, onOpenPrivacy,
}: {
  busy: boolean;
  checked: boolean;
  onToggle: () => void;
  error?: string;
  onGoogle: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();

  return (
    <>
      <View style={styles.groupCard}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel="I agree to the Terms and Privacy Policy"
          style={({ pressed }) => [styles.consentRow, pressed && styles.consentRowPressed]}
          hitSlop={6}
        >
          <View style={[styles.checkbox, checked && styles.checkboxOn]}>
            {checked ? (
              <Ionicons name="checkmark" size={14} color={colors.primary} />
            ) : null}
          </View>
          <T variant="small" tone="onPrimary" style={styles.consentText}>
            I agree to the{' '}
            <T
              variant="small"
              style={styles.consentLink}
              onPress={onOpenTerms}
            >
              Terms &amp; Conditions
            </T>
            {' and '}
            <T
              variant="small"
              style={styles.consentLink}
              onPress={onOpenPrivacy}
            >
              Privacy Policy
            </T>
            .
          </T>
        </Pressable>

        <View style={styles.divider} />

        <GoogleSignInButton
          label={busy ? 'Signing in…' : 'Continue with Google'}
          loading={busy}
          disabled={!checked}
          onPress={onGoogle}
        />
      </View>

      {error ? (
        <T variant="small" tone="onPrimary" center style={styles.footerLine}>
          {error}
        </T>
      ) : (
        <T variant="caption" color={colors.onPrimaryMuted} center style={styles.footerLine}>
          New here? Signing in creates your moi book.
        </T>
      )}
    </>
  );
}

/**
 * Returning: direct button, no checkbox, passive consent reminder.
 */
function ReturningActions({
  busy, error, onGoogle, onOpenTerms, onOpenPrivacy,
}: {
  busy: boolean;
  error?: string;
  onGoogle: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();

  return (
    <>
      <GoogleSignInButton
        label={busy ? 'Signing in…' : 'Continue with Google'}
        loading={busy}
        onPress={onGoogle}
      />

      {error ? (
        <T variant="small" tone="onPrimary" center style={styles.footerLine}>
          {error}
        </T>
      ) : (
        <T variant="caption" color={colors.onPrimaryMuted} center style={styles.footerLine}>
          By continuing you agree to our{' '}
          <T
            variant="caption"
            tone="onPrimary"
            style={styles.consentLink}
            onPress={onOpenTerms}
          >
            Terms
          </T>
          {' and '}
          <T
            variant="caption"
            tone="onPrimary"
            style={styles.consentLink}
            onPress={onOpenPrivacy}
          >
            Privacy Policy
          </T>
          .
        </T>
      )}
    </>
  );
}

const useStyles = makeStyles(() => ({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  tagline: {
    marginTop: spacing.md,
  },
  identity: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },

  // First-time grouped card
  groupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  consentRowPressed: {
    opacity: 0.7,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: '#FFD66B',
    borderColor: '#FFD66B',
  },
  consentText: {
    flex: 1,
    lineHeight: 20,
  },
  consentLink: {
    textDecorationLine: 'underline',
    color: '#FFD66B',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginVertical: spacing.md,
    marginHorizontal: -spacing.xs,
  },

  // Shared footer line (error, "New here?", or returning-state passive consent)
  footerLine: {
    marginTop: spacing.sm,
  },
}));
