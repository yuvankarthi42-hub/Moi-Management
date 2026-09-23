import React from 'react';
import { View, ViewStyle } from 'react-native';

import { makeStyles, radius, spacing, useColors } from '../../theme';
import { T } from '../ui/Text';

export type HeroTone = 'brand' | 'success' | 'danger';

/**
 * The headline figure at the top of a report.
 *
 * It exists as one component because the colour pairing is easy to get wrong:
 * the semantic greens and reds are tuned to be legible *as text on a page*, so
 * in dark mode they are bright, and white sitting on them drops to around 2:1.
 * Each tone therefore names the text colour that belongs with its fill instead
 * of every screen assuming white.
 */
export function HeroTotal({
  label,
  value,
  tone = 'brand',
  style,
}: {
  label: string;
  value: string;
  tone?: HeroTone;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const colors = useColors();

  const fill =
    tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.headerGradient[0];
  const text =
    tone === 'success' ? colors.onSuccess : tone === 'danger' ? colors.onDanger : colors.onPrimary;

  return (
    <View style={[styles.wrap, { backgroundColor: fill }, style]}>
      {/* Same ink as the figure at full strength: dimming it with opacity
          multiplies against the fill and quietly drops the contrast ratio. */}
      <T variant="smallStrong" color={text} style={styles.label} center>
        {label}
      </T>
      <T variant="display" color={text} center adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </T>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  wrap: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  label: {
    marginBottom: 2,
  },
}));
