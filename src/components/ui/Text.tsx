import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';

import { colors, typography } from '../../theme';
import { formatMoney, formatMoneyCompact } from '../../utils/format';

type Variant = keyof typeof typography;
type Tone = 'default' | 'secondary' | 'muted' | 'primary' | 'onPrimary' | 'success' | 'danger' | 'warning';

const TONES: Record<Tone, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  primary: colors.primary,
  onPrimary: colors.onPrimary,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
};

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
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: color ?? TONES[tone] },
        center && styles.center,
        style,
      ]}
    />
  );
}

/**
 * Money, rendered with tabular-ish alignment and a direction tone.
 * `flow="out"` is money the household gave; `"in"` is money collected.
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
  const color =
    flow === 'in' ? colors.amountIn : flow === 'out' ? colors.amountOut : colors.text;
  return (
    <RNText style={[typography[variant], { color }, style]} numberOfLines={1}>
      {compact ? formatMoneyCompact(value) : formatMoney(value)}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
});
