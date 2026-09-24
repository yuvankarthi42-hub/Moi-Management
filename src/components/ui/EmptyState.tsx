import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, ViewStyle } from 'react-native';

import { colors, makeStyles, radius, spacing } from '../../theme';
import { Button } from './Button';
import { T } from './Text';

/** Shown whenever a list has nothing in it — never leave a blank screen. */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <T variant="h3" center style={styles.title}>
        {title}
      </T>
      {message ? (
        <T variant="small" tone="muted" center style={styles.message}>
          {message}
        </T>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} size="md" style={styles.action} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.xl,
    minWidth: 180,
  },
}));
