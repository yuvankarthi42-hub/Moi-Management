import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppData } from '../../store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../../theme';
import { T } from '../ui/Text';

/**
 * Says so when the records on screen came from the cache.
 *
 * Offline is read-only, and the app owes the user a reason rather than a set
 * of buttons that quietly do nothing. It also says *when* the snapshot was
 * fetched: at a moi table that is the difference between trusting a total and
 * checking it again.
 */
export function OfflineBanner() {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { online, showingCached, cachedAt } = useAppData();

  if (online && !showingCached) return null;

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.xs }]}>
      <Ionicons name="cloud-offline-outline" size={15} color={colors.onPrimary} />
      <T variant="caption" tone="onPrimary" numberOfLines={1} style={styles.text}>
        Offline — viewing only{cachedAt ? `, saved ${describeAge(cachedAt)}` : ''}
      </T>
    </View>
  );
}

/** "just now" / "2 hours ago" / "yesterday" — enough to judge the numbers by. */
function describeAge(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'earlier';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.textMuted,
  },
  text: {
    flexShrink: 1,
  },
}));
