import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../src/auth';
import { BrandMark } from '../src/components/app/BrandMark';
import { T } from '../src/components/ui';
import { useAppData } from '../src/store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../src/theme';

/**
 * Launch screen.
 *
 * Holds the branded splash until both the session and the dataset are known,
 * then routes once: a signed-in phone goes straight to the tabs, a new one to
 * the landing screen. Waiting for both avoids the welcome screen flashing at
 * someone who is already signed in.
 */
export default function Launch() {
  const styles = useStyles();
  const colors = useColors();
  const { loading, error } = useAppData();
  const { account, loading: authLoading } = useAuth();

  if (!loading && !authLoading && !error) {
    return <Redirect href={account ? '/(tabs)' : '/welcome'} />;
  }

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
