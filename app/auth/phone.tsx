import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthError, DEFAULT_COUNTRY, useAuth } from '../../src/auth';
import { PhoneField } from '../../src/components/app/PhoneField';
import { Button, Card, T } from '../../src/components/ui';
import { useAuthDestination } from '../../src/navigation/useAuthDestination';
import { makeStyles, safeAreaFloor, spacing, useColors } from '../../src/theme';

/**
 * Collected once, after the first Google sign-in.
 *
 * Google gives a name, an email and an avatar but never a mobile number, and
 * the number is what a moi book actually runs on — it is how a person is
 * matched to a contact, and how per-function sharing will find somebody to
 * invite. So it is asked for once and then never again: `users.phone` being
 * NULL is the whole test for "still owes us one".
 *
 * There is no skip. A book with no number against it cannot be shared later
 * and cannot be recovered onto another phone.
 */
export default function PhoneScreen() {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { account, savePhone, signOut } = useAuth();
  const destination = useAuthDestination();

  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY.code);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    setError(undefined);
    setBusy(true);
    try {
      await savePhone(countryCode, phone);
      // No further action here: saving fills the number into the account,
      // which flips `useAuthDestination` to 'home' on the very next render —
      // the guard below is what actually sends the screen on from there.
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : 'Could not save your number. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  // Reached two ways this has to notice on its own: saving the number above
  // (destination becomes 'home'), and the Sign out button below (destination
  // becomes 'welcome'). Neither is a navigation, in-app or otherwise — the
  // account just changes underneath a screen that is still mounted — so
  // nothing upstream is watching for it. See `useAuthDestination`.
  if (destination === 'welcome') return <Redirect href="/welcome" />;
  if (destination === 'home') return <Redirect href="/(tabs)" />;

  return (
    <LinearGradient colors={colors.splashGradient} style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.body,
            {
              paddingTop: safeAreaFloor(insets.top, 'top', spacing.xxxl),
              paddingBottom: safeAreaFloor(insets.bottom, 'bottom', spacing.xl),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <T variant="display" tone="onPrimary" center>
            One last thing
          </T>
          <T variant="body" color={colors.onPrimaryMuted} center style={styles.lede}>
            {account?.name ? `Welcome, ${account.name}.` : 'Welcome.'}{'\n'}
            What is your mobile number?
          </T>

          <Card style={styles.card}>
            <PhoneField
              countryCode={countryCode}
              onChangeCountryCode={setCountryCode}
              phone={phone}
              onChangePhone={setPhone}
              error={error}
              autoFocus
            />
            <T variant="caption" tone="muted" style={styles.hint}>
              Kept with your profile. Used to identify your book — never shown to
              anyone else.
            </T>
            <Button
              label={busy ? 'Saving…' : 'Continue'}
              size="lg"
              block
              disabled={busy || phone.replace(/\D/g, '').length < 6}
              onPress={onSave}
              style={styles.save}
            />
          </Card>

          {/* A way out that is not a skip: sign out and come back later. */}
          <Button
            label="Sign out"
            variant="ghost"
            block
            textColor={colors.onPrimaryMuted}
            onPress={signOut}
            style={styles.out}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const useStyles = makeStyles(() => ({
  root: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  lede: {
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.xxxl,
  },
  hint: {
    marginTop: spacing.sm,
  },
  save: {
    marginTop: spacing.lg,
  },
  out: {
    marginTop: spacing.lg,
  },
}));
