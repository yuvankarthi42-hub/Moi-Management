import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { makeStyles, spacing } from '../../theme';
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
  const styles = useStyles();
  return (
    <View style={[styles.row, style]}>
      <T variant="h3" style={styles.title}>
        {title}
      </T>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          // Padded to a 44pt target rather than the text's own line height.
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <T variant="smallStrong" tone="primary">
            {actionLabel}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    marginRight: spacing.md,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
}));
