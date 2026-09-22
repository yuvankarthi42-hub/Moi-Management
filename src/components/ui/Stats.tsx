import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, spacing } from '../../theme';
import { T } from './Text';

export interface StatItem {
  label: string;
  value: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
}

/**
 * A row of equal-width figures separated by hairlines — the "12 Functions /
 * ₹8,45,500 Total Moi / 486 People" block on Home and the three-up summary on
 * the function detail screen.
 */
export function StatRow({
  items,
  style,
  compactLabels = false,
}: {
  items: StatItem[];
  style?: ViewStyle;
  compactLabels?: boolean;
}) {
  return (
    <View style={[styles.row, style]}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.cell}>
            <T
              variant="h3"
              tone={item.tone === 'default' || !item.tone ? 'default' : item.tone}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              center
            >
              {item.value}
            </T>
            <T
              variant={compactLabels ? 'caption' : 'small'}
              tone="muted"
              center
              numberOfLines={compactLabels ? 1 : 2}
              style={styles.label}
            >
              {item.label}
            </T>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  label: {
    marginTop: 2,
  },
});
