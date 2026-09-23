import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform, Pressable, StyleSheet, Text, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors, contentColumn, makeStyles, radius, spacing, typography, useColors,
} from '../../theme';

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Shows a back chevron. Defaults to true when the router can go back. */
  showBack?: boolean;
  onBack?: () => void;
  actions?: HeaderAction[];
  /** Rendered inside the gradient, beneath the title row. */
  children?: React.ReactNode;
  /**
   * Extra gradient height behind the content below, so a card can overlap the
   * header edge (used on Home and the report screens).
   */
  bleed?: number;
  style?: ViewStyle;
}

/**
 * The purple gradient header used across the app.
 *
 * The gradient starts at y=0 and the *content* is pushed down by the device's
 * top inset, so colour fills the status bar on notched iPhones and under
 * Android's edge-to-edge status bar alike.
 */
export function AppHeader({
  title,
  subtitle,
  showBack,
  onBack,
  actions,
  children,
  bleed = 0,
  style,
}: AppHeaderProps) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const canGoBack = showBack ?? router.canGoBack();
  const handleBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <LinearGradient
      colors={colors.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.lg + bleed,
          marginBottom: -bleed,
        },
        style,
      ]}
    >
      <View style={styles.column}>
      <View style={styles.titleRow}>
        {canGoBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
          </Pressable>
        ) : (
          <View style={styles.iconSpacer} />
        )}

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {actions?.map((action) => (
            <Pressable
              key={action.icon}
              onPress={action.onPress}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name={action.icon} size={21} color={colors.onPrimary} />
            </Pressable>
          ))}
        </View>
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}
      </View>
    </LinearGradient>
  );
}

/** Bare gradient block — for screens that compose their own header content. */
export function HeaderCanvas({
  children,
  bleed = 0,
  style,
}: {
  children: React.ReactNode;
  bleed?: number;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={colors.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.lg + bleed,
          marginBottom: -bleed,
        },
        style,
      ]}
    >
      <View style={styles.column}>{children}</View>
    </LinearGradient>
  );
}

const useStyles = makeStyles((colors) => ({
  column: contentColumn,
  header: {
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  titleBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.onPrimary,
  },
  subtitle: {
    ...typography.small,
    color: colors.onPrimaryMuted,
    marginTop: 2,
  },
  iconButton: {
    // 44 is the smallest comfortable touch target on both platforms.
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  iconSpacer: {
    width: Platform.select({ default: 0 }),
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  children: {
    marginTop: spacing.lg,
  },
}));
