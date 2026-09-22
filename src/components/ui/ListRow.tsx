import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme';
import { T } from './Text';

/** Settings-style row: icon, title, optional value, chevron. */
export function ListRow({
  icon,
  iconTint = colors.primary,
  title,
  subtitle,
  value,
  onPress,
  showChevron = true,
  right,
  destructive = false,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconTint?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  right?: React.ReactNode;
  destructive?: boolean;
  style?: ViewStyle;
}) {
  const body = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: `${iconTint}18` }]}>
          <Ionicons
            name={icon}
            size={19}
            color={destructive ? colors.danger : iconTint}
          />
        </View>
      ) : null}

      <View style={styles.text}>
        <T variant="body" tone={destructive ? 'danger' : 'default'} numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T variant="caption" tone="muted" numberOfLines={2} style={styles.subtitle}>
            {subtitle}
          </T>
        ) : null}
      </View>

      {right ?? (
        <View style={styles.trailing}>
          {value ? (
            <T variant="small" tone="muted" numberOfLines={1}>
              {value}
            </T>
          ) : null}
          {showChevron && onPress ? (
            <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
          ) : null}
        </View>
      )}
    </>
  );

  if (!onPress) return <View style={[styles.row, style]}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

/** Hairline divider aligned to the text column, not the icon. */
export function RowDivider({ inset = true }: { inset?: boolean }) {
  return <View style={[styles.divider, inset && styles.dividerInset]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 56,
    backgroundColor: colors.surface,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  text: {
    flex: 1,
    marginRight: spacing.md,
  },
  subtitle: {
    marginTop: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerInset: {
    marginLeft: spacing.lg + 36 + spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
});
