import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, makeStyles, radius, spacing, useColors } from '../../theme';
import { Money, T } from '../ui/Text';

/**
 * One line of a report table: rank/emoji, a label with a sub-line, the amount,
 * and an optional share bar that makes relative size readable at a glance.
 */
export function ReportRow({
  leading,
  title,
  subtitle,
  amount,
  share,
  flow = 'in',
  last = false,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  amount: number;
  /** 0–1. Draws a proportional bar under the row when provided. */
  share?: number;
  flow?: 'in' | 'out' | 'neutral';
  last?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.main}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.text}>
          <T variant="bodyStrong" numberOfLines={1}>
            {title}
          </T>
          {subtitle ? (
            <T variant="caption" tone="muted" numberOfLines={1}>
              {subtitle}
            </T>
          ) : null}
        </View>
        <Money value={amount} flow={flow} variant="bodyStrong" />
      </View>

      {share != null ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              // Keep a sliver visible so tiny contributions still register.
              { width: `${Math.max(share * 100, 1.5)}%` },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  leading: {
    minWidth: 30,
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
}));
