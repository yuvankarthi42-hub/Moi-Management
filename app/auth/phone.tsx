import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthError, DEFAULT_COUNTRY, useAuth } from '../../src/auth';
import { PhoneField } from '../../src/components/app/PhoneField';
import { Avatar, Button, T } from '../../src/components/ui';
import { useAuthDestination } from '../../src/navigation/useAuthDestination';
import { makeStyles, radius, safeAreaFloor, shadow, spacing, useColors } from '../../src/theme';

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
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.root}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: safeAreaFloor(insets.bottom, 'bottom', spacing.xl) },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/*
            The purple banner carries identity: whose book is being set up, and
            a way out if that is the wrong account. The gradient matches the
            Welcome screen the user just came from, so this step feels like
            the second half of one flow rather than a different app.
          */}
          <LinearGradient
            colors={colors.splashGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.banner,
              { paddingTop: safeAreaFloor(insets.top, 'top', spacing.xxxl) },
            ]}
          >
            <View style={styles.profileRow}>
              <Avatar
                name={account?.name || 'You'}
                uri={account?.photoUri}
                seed={account?.id}
                size={42}
              />
              <View style={styles.profileText}>
                <T variant="smallStrong" tone="onPrimary" numberOfLines={1}>
                  {account?.name || 'Signed in'}
                </T>
                {account?.email ? (
                  <T variant="caption" color={colors.onPrimaryMuted} numberOfLines={1}>
                    {account.email}
                  </T>
                ) : null}
              </View>
              <Pressable
                onPress={signOut}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Sign out"
                style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
              >
                <T variant="small" color={colors.onPrimaryMuted}>
                  Sign out
                </T>
              </Pressable>
            </View>
          </LinearGradient>

          {/*
            The illustration floats half over the banner edge: a small
            delight, and a visual anchor that marks "this is the step about
            your number" without needing an arrow or a label to say so.
          */}
          <View style={styles.illustrationWrap} pointerEvents="none">
            <View style={[styles.illustration, shadow(2)]}>
              <Ionicons name="phone-portrait-outline" size={44} color={colors.primary} />
              <View style={styles.illustrationBadge}>
                <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
              </View>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <T variant="h1" center>
              One last step
            </T>
            <T variant="body" tone="muted" center style={styles.subtitle}>
              Add the mobile number for your book.
            </T>
          </View>

          <View style={styles.fieldWrap}>
            <PhoneField
              countryCode={countryCode}
              onChangeCountryCode={setCountryCode}
              phone={phone}
              onChangePhone={setPhone}
              error={error}
              autoFocus
            />
          </View>

          {/*
            Reassurance moves into a self-contained card rather than running
            as grey microcopy under the field, so the "why" is read at a
            glance and the field itself stays visually clean.
          */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="information" size={14} color={colors.onPrimary} />
            </View>
            <View style={styles.infoText}>
              <T variant="smallStrong" style={styles.infoTitle}>
                Why we need this
              </T>
              <T variant="small" tone="secondary" style={styles.infoBody}>
                Your number is how your book finds you again when you reinstall or
                switch phones. It is never shown to anyone else.
              </T>
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <Button
              label={busy ? 'Saving…' : 'Continue'}
              size="lg"
              block
              disabled={busy || phone.replace(/\D/g, '').length < 6}
              onPress={onSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * `BANNER_MIN_HEIGHT` is the gradient's floor on a device with no top safe
 * area at all; the inset is added on top. `ILLUSTRATION_SIZE` sets both the
 * card and the negative offset that lifts it over the banner edge, so if the
 * card ever grows the overlap re-centres on it without a second number to
 * update.
 */
const BANNER_MIN_HEIGHT = 140;
const ILLUSTRATION_SIZE = 92;

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  banner: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl + spacing.sm,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    minHeight: BANNER_MIN_HEIGHT,
    justifyContent: 'flex-end',
    // Needed on Android for the bottom radius to actually clip the gradient.
    overflow: 'hidden',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileText: {
    flex: 1,
  },
  signOut: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  illustrationWrap: {
    marginTop: -ILLUSTRATION_SIZE / 2,
    alignItems: 'center',
  },
  illustration: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  titleBlock: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  fieldWrap: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  infoCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: colors.primarySofter,
    borderRadius: radius.lg,
  },
  infoIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    color: colors.primary,
    marginBottom: 2,
  },
  infoBody: {
    lineHeight: 19,
  },
  spacer: {
    flexGrow: 1,
    minHeight: spacing.xxl,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
}));
