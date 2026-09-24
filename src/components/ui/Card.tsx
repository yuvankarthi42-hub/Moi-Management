import React from 'react';
import { Pressable, View, ViewStyle } from 'react-native';

import { makeStyles, radius, shadow, spacing, useColors } from '../../theme';

export function Card({
  children,
  style,
  onPress,
  padded = true,
  elevation = 1,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  padded?: boolean;
  elevation?: 0 | 1 | 2 | 3;
}) {
  const styles = useStyles();
  const colors = useColors();
  const base = [
    styles.card,
    padded && styles.padded,
    elevation > 0 && shadow(elevation as 1 | 2 | 3),
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // Android gets a native ripple; iOS gets a subtle press-down opacity.
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.9,
  },
}));
