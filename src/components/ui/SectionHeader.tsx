import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '../../theme';
import { T } from './Text';

/** "Upcoming Function" / "Recent Functions" heading with an optional link. */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]}>
      <T variant="h3" style={styles.title}>
        {title}
      </T>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <T variant="smallStrong" tone="primary">
            {actionLabel}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: {
    flex: 1,
    marginRight: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
});
