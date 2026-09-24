import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAppData } from '../../store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../../theme';
import { EmptyState } from '../ui/EmptyState';
import { T } from '../ui/Text';

/**
 * Holds a screen back until the dataset has loaded.
 *
 * Without this, opening a deep link (or a web reload on `/people`) renders the
 * screen against an empty dataset for a frame or two, so the user is told
 * "No people yet" about records that are simply still loading.
 */
export function DataGate({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const colors = useColors();
  const { loading, error, refresh } = useAppData();

  if (error) {
    return (
      <View style={styles.centre}>
        <EmptyState
          icon="cloud-offline-outline"
          title="Could not load your data"
          message={error}
          actionLabel="Try again"
          onAction={refresh}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} />
        <T variant="small" tone="muted" style={styles.label}>
          Loading your records…
        </T>
      </View>
    );
  }

  return <>{children}</>;
}

const useStyles = makeStyles((colors) => ({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  label: {
    marginTop: spacing.md,
  },
}));
