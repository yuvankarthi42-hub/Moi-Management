import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View, ViewStyle } from 'react-native';

import { makeStyles, radius, shadow, spacing, type Palette, typography, useColors } from '../../theme';

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
  /**
   * Overrides the label and icon colour. For buttons that sit on a branded
   * surface rather than the page — the launch screen's gradient — where the
   * palette's own foregrounds are picked for contrast against `background`.
   */
  textColor?: string;
  style?: ViewStyle;
}

interface VariantPalette {
  bg: string;
  fg: string;
  border?: string;
}

/** Resolved per render so the button follows the active theme. */
function variantPalette(variant: Variant, colors: Palette): VariantPalette {
  switch (variant) {
    case 'secondary': return { bg: colors.primarySoft, fg: colors.primary };
    case 'success': return { bg: colors.success, fg: colors.onSuccess };
    case 'danger': return { bg: colors.danger, fg: colors.onDanger };
    case 'ghost': return { bg: 'transparent', fg: colors.primary };
    case 'outline':
      return { bg: colors.surface, fg: colors.primary, border: colors.borderStrong };
    case 'primary':
    default: return { bg: colors.primary, fg: colors.onPrimary };
  }
}

/**
 * Heights clear the 44pt minimum comfortable touch target on every size, and
 * are applied as `minHeight` so a large system font grows the button instead of
 * clipping its label.
 */
const SIZES: Record<Size, { height: number; paddingH: number; font: 14 | 15 | 17 }> = {
  sm: { height: 44, paddingH: spacing.md, font: 14 },
  md: { height: 48, paddingH: spacing.lg, font: 15 },
  lg: { height: 56, paddingH: spacing.xl, font: 17 },
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
  textColor,
  style,
}: ButtonProps) {
  const styles = useStyles();
  const colors = useColors();
  const base = variantPalette(variant, colors);
  const palette = textColor ? { ...base, fg: textColor } : base;
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
          minHeight: dims.height,
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

const useStyles = makeStyles((colors) => ({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  block: {
    // `flex: 1` would set flex-basis to 0, which is fine in a row (the buttons
    // share the width) but collapses the height to the text line inside a
    // column parent such as DockedFooter. An `auto` basis keeps the declared
    // height in both directions.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
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
}));
