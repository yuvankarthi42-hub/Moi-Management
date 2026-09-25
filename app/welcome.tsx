import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, T } from '../src/components/ui';
import { makeStyles, radius, spacing, useColors } from '../src/theme';

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
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {/* Takes the whole space above the buttons and centres the mark in it,
            so the logo sits on the screen's axis rather than near the top. */}
        <View style={styles.identity}>
          <View style={styles.badge}>
            <T style={styles.emoji} allowFontScaling={false}>
              🪔
            </T>
          </View>

          <T variant="display" tone="onPrimary" center>
            Moi Manager
          </T>
          <T variant="body" color={colors.onPrimaryMuted} center style={styles.tagline}>
            Every moi you receive and return,{'\n'}in one place
          </T>
        </View>

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
  badge: {
    width: 108,
    height: 108,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  emoji: {
    fontSize: 52,
    lineHeight: 60,
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
  secondary: {
    // Ghost on the gradient, so it reads as the quieter of the two without a
    // second filled button competing with "Create account".
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
}));
