import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MandalaMark } from '../src/components/app/MandalaMark';
import { Button, T } from '../src/components/ui';
import { makeStyles, spacing, useColors } from '../src/theme';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={colors.splashGradient} style={styles.root}>
      <View
        style={[
          styles.body,
          { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.art}>
          <MandalaMark size={232} />
        </View>

        <T variant="display" tone="onPrimary" center>
          Moi Manager
        </T>
        <T variant="body" color={colors.onPrimaryMuted} center style={styles.tagline}>
          Every moi you receive and return,{'\n'}in one place
        </T>

        <View style={styles.spacer} />

        <View style={styles.actions}>
          <Button
            label="Create account"
            size="lg"
            block
            onPress={() => router.push('/auth/sign-up')}
          />
          <Button
            label="I already have an account"
            variant="ghost"
            size="lg"
            block
            // The gradient is the same deep purple in both themes, so the
            // label takes its colour from the surface it sits on, not the
            // palette's page foregrounds.
            textColor={colors.onPrimary}
            style={styles.secondary}
            onPress={() => router.push('/auth/sign-in')}
          />
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
  art: {
    marginBottom: spacing.xxxl,
  },
  tagline: {
    marginTop: spacing.md,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xxxl,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  secondary: {
    // Ghost on the gradient, so it reads as the quieter of the two without a
    // second filled button competing with "Create account".
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
}));
