import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle,
} from 'react-native';

import { colors, radius, shadow, spacing, typography } from '../../theme';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  /** Stretches to fill the parent row. */
  block?: boolean;
  style?: ViewStyle;
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.success, fg: '#FFFFFF' },
  danger: { bg: colors.danger, fg: '#FFFFFF' },
  ghost: { bg: 'transparent', fg: colors.primary },
  outline: { bg: colors.surface, fg: colors.primary, border: colors.borderStrong },
};

const SIZES: Record<Size, { height: number; paddingH: number; font: 13 | 15 | 16 }> = {
  sm: { height: 36, paddingH: spacing.md, font: 13 },
  md: { height: 46, paddingH: spacing.lg, font: 15 },
  lg: { height: 54, paddingH: spacing.xl, font: 16 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  block = false,
  style,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const dims = SIZES[size];
  const inactive = disabled || loading;
  const raised = variant === 'primary' || variant === 'success' || variant === 'danger';

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.inner}>
          {icon && iconPosition === 'left' ? (
            <Ionicons name={icon} size={dims.font + 3} color={palette.fg} style={styles.iconLeft} />
          ) : null}
          <Text style={[typography.bodyStrong, { color: palette.fg, fontSize: dims.font }]} numberOfLines={1}>
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={dims.font + 3} color={palette.fg} style={styles.iconRight} />
          ) : null}
        </View>
      )}
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      android_ripple={
        variant === 'ghost' ? { color: colors.primarySoft } : { color: 'rgba(255,255,255,0.22)' }
      }
      style={({ pressed }) => [
        styles.base,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingH,
          backgroundColor: palette.bg,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border,
        },
        raised && !inactive && shadow(1),
        block && styles.block,
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  block: {
    flex: 1,
    alignSelf: 'stretch',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
});
