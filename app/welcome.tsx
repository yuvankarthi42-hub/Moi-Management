import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthError, useAuth } from '../src/auth';
import { BrandMark } from '../src/components/app/BrandMark';
import { GoogleSignInButton } from '../src/components/app/GoogleSignInButton';
import { T } from '../src/components/ui';
import { useAuthDestination } from '../src/navigation/useAuthDestination';
import { makeStyles, safeAreaFloor, spacing, useColors } from '../src/theme';

/**
 * Landing screen — the first thing a new phone sees.
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

  const onGoogle = async () => {
    setError(undefined);
    setBusy(true);
    try {
      await signInWithGoogle();
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
        {/* Takes the whole space above the buttons and centres the mark in it,
            so the logo sits on the screen's axis rather than near the top. */}
        <View style={styles.identity}>
          <BrandMark size={248} />

          <T variant="display" tone="onPrimary" center>
            Moi Manager
          </T>
          <T variant="body" color={colors.onPrimaryMuted} center style={styles.tagline}>
            Every moi you receive and return,{'\n'}in one place
          </T>
        </View>

        <View style={styles.actions}>
          {/* One way in. Google is the only provider, so offering a choice
              would only be offering the same thing twice. */}
          <GoogleSignInButton
            label={busy ? 'Signing in\u2026' : 'Continue with Google'}
            loading={busy}
            onPress={onGoogle}
          />
          {error ? (
            <T variant="small" tone="onPrimary" center style={styles.error}>
              {error}
            </T>
          ) : (
            <T variant="caption" color={colors.onPrimaryMuted} center style={styles.error}>
              New here? Signing in creates your moi book.
            </T>
          )}

          {/* The consent line goes with the button, not hidden behind a tap:
              the reader sees it before they sign in, not after. Nesting the
              Terms / Privacy spans inside a single <T> keeps them in-line
              with the surrounding sentence and inheriting its typography,
              which Pressable children would break. */}
          <T variant="caption" color={colors.onPrimaryMuted} center style={styles.consent}>
            By continuing you agree to our{' '}
            <T
              variant="caption"
              tone="onPrimary"
              style={styles.consentLink}
              onPress={() => router.push('/legal/terms')}
            >
              Terms
            </T>
            {' and '}
            <T
              variant="caption"
              tone="onPrimary"
              style={styles.consentLink}
              onPress={() => router.push('/legal/privacy')}
            >
              Privacy Policy
            </T>
            .
          </T>
        </View>
      </View>
    </LinearGradient>
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
  error: {
    marginTop: spacing.xs,
  },
  consent: {
    marginTop: spacing.md,
  },
  consentLink: {
    textDecorationLine: 'underline',
  },
}));
