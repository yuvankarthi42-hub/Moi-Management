import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { T } from '../src/components/ui';
import { useAppData } from '../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing, useColors } from '../src/theme';

/**
 * Launch screen. Holds the branded splash until the dataset has loaded, then
 * hands off to the tabs — so the home screen never flashes empty totals.
 */
export default function Launch() {
  const styles = useStyles();
  const colors = useColors();
  const { loading, error } = useAppData();

  if (!loading && !error) return <Redirect href="/(tabs)" />;

  return (
    <LinearGradient colors={colors.splashGradient} style={styles.root}>
      <View style={styles.badge}>
        <T style={styles.emoji} allowFontScaling={false}>
          🪔
        </T>
      </View>
      <T variant="display" tone="onPrimary" center>
        Moi Manager
      </T>
      <T variant="small" color={colors.onPrimaryMuted} center style={styles.tagline}>
        From invitation to moi report,{'\n'}everything in one app
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
    marginTop: spacing.sm,
  },
  spinner: {
    marginTop: spacing.xxxl,
  },
  error: {
    marginTop: spacing.xxxl,
  },
}));
