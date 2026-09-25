import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';

import { makeStyles, type Palette, typography, useColors } from '../../theme';
import { formatMoney, formatMoneyCompact } from '../../utils/format';

type Variant = keyof typeof typography;
type Tone = 'default' | 'secondary' | 'muted' | 'primary' | 'onPrimary' | 'success' | 'danger' | 'warning';

/** Resolves a tone against the active palette — never frozen at module load. */
function toneColor(tone: Tone, colors: Palette): string {
  switch (tone) {
    case 'secondary': return colors.textSecondary;
    case 'muted': return colors.textMuted;
    case 'primary': return colors.primary;
    case 'onPrimary': return colors.onPrimary;
    case 'success': return colors.success;
    case 'danger': return colors.danger;
    case 'warning': return colors.warning;
    case 'default':
    default: return colors.text;
  }
}

export interface TypedTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  color?: string;
  center?: boolean;
  style?: TextStyle | TextStyle[];
}

/** Text bound to the type ramp — screens should not set fontSize directly. */
export function T({
  variant = 'body',
  tone = 'default',
  color,
  center,
  style,
  ...rest
}: TypedTextProps) {
  const styles = useStyles();
  const colors = useColors();

  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: color ?? toneColor(tone, colors) },
        center && styles.center,
        style,
      ]}
    />
  );
}

/**
 * Money, coloured by which way it moved for the household.
 *
 * `flow="in"` is money that came to us — moi received, a function's
 * collection, what a person has given us over the years — and is green.
 * `flow="out"` is money that left: expenses, and moi given back. Red.
 *
 * The direction is the household's, never the other party's: a moi entry is
 * income even though the guest paid it, so it is `"in"`. Getting that backwards
 * is the one way these colours go wrong, and it reads as a bug to anyone
 * scanning a list for what they collected.
 */
export function Money({
  value,
  variant = 'bodyStrong',
  flow = 'neutral',
  compact = false,
  style,
}: {
  value: number;
  variant?: Variant;
  flow?: 'in' | 'out' | 'neutral';
  compact?: boolean;
  style?: TextStyle;
}) {
  const colors = useColors();
  const color =
    flow === 'in' ? colors.amountIn : flow === 'out' ? colors.amountOut : colors.text;
  return (
    <RNText style={[typography[variant], { color }, style]} numberOfLines={1}>
      {compact ? formatMoneyCompact(value) : formatMoney(value)}
    </RNText>
  );
}

const useStyles = makeStyles((colors) => ({
  center: {
    textAlign: 'center',
  },
}));
