import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

export interface ChipOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional trailing count, e.g. "All (156)". */
  count?: number;
}

/**
 * Horizontally scrolling filter chips (the All / Upcoming / Completed row).
 * Scrolls rather than wraps so the row keeps one predictable height on small
 * screens and in Tamil, where labels are longer.
 */
export function ChipBar<T extends string>({
  options,
  value,
  onChange,
  style,
  contentStyle,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.bar, style]}
      contentContainerStyle={[styles.barContent, contentStyle]}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : styles.chipIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.smallStrong,
                { color: active ? colors.onPrimary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {option.label}
              {option.count != null ? ` (${option.count})` : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Equal-width segmented control used for mutually exclusive settings such as
 * the payment type on the Add Moi form.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.smallStrong,
                { color: active ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small status pill — "10 Days Left", "Accepted", "Upcoming". */
export function Badge({
  label,
  tone = 'primary',
  style,
}: {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  style?: ViewStyle;
}) {
  const palette = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    neutral: { bg: colors.border, fg: colors.textSecondary },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[typography.captionStrong, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
  },
  barContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    height: 34,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySofter,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.75,
  },
});
