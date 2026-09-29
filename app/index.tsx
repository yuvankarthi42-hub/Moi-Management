import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { BrandMark } from '../src/components/app/BrandMark';
import { T } from '../src/components/ui';
import { useAuthDestination } from '../src/navigation/useAuthDestination';
import { useAppData } from '../src/store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../src/theme';

/**
 * Launch screen.
 *
 * Holds the branded splash until `useAuthDestination` knows where this phone
 * belongs, then sends it there once. This is not the only screen that can
 * make that call — see `useAuthDestination`'s own comment for why `/welcome`
 * and `/auth/phone` each repeat the same check — but it is the one shown
 * while the answer is still 'loading', and the one that surfaces a dataset
 * load failure rather than bouncing away from it.
 */
export default function Launch() {
  const styles = useStyles();
  const colors = useColors();
  const { error } = useAppData();
  const destination = useAuthDestination();

  if (destination === 'welcome') return <Redirect href="/welcome" />;
  if (destination === 'phone') return <Redirect href="/auth/phone" />;
  if (destination === 'home') return <Redirect href="/(tabs)" />;

  return (
    <LinearGradient colors={colors.splashGradient} style={styles.root}>
      <View style={styles.mark}>
        <BrandMark size={200} />
      </View>
      <T variant="display" tone="onPrimary" center>
        Moi Manager
      </T>
      <T variant="small" color={colors.onPrimaryMuted} center style={styles.tagline}>
        Every moi you receive and return,{'\n'}in one place
      </T>

      {error ? (
        <T variant="small" tone="onPrimary" center style={styles.error}>
          {error}
        </T>
      ) : (
        <ActivityIndicator color={colors.onPrimary} style={styles.spinner} />
      )}
    </LinearGradient>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  mark: {
    marginBottom: spacing.lg,
  },
  tagline: {
    marginTop: spacing.sm,
  },
  spinner: {
    marginTop: spacing.xxxl,
  },
  error: {
    marginTop: spacing.xxxl,
  },
}));
