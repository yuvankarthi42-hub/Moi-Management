import React from 'react';
import {
  Animated, Platform, ScrollViewProps, StyleSheet, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT, contentColumn, makeStyles, spacing, useColors } from '../../theme';

/**
 * Root container for every screen.
 *
 * Safe areas are handled here rather than with `SafeAreaView` so that a
 * coloured header can bleed *under* the status bar while its content still
 * clears it. The bottom inset is applied to scroll content (not the container)
 * so lists scroll behind the home indicator instead of stopping short of it.
 */
export function Screen({
  children,
  style,
  background,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  background?: string;
}) {
  const styles = useStyles();
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: background ?? colors.background }, style]}>
      {children}
    </View>
  );
}

export interface ScreenScrollProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Adds room for the floating tab bar. Set false on stacked screens. */
  withTabBar?: boolean;
  /** Extra bottom room, e.g. for a docked action button. */
  extraBottomSpace?: number;
  contentStyle?: ViewStyle;
}

/**
 * Scrollable screen body with correct bottom padding on every device: the home
 * indicator inset, the tab bar when present, and any docked footer.
 */
export function ScreenScroll({
  children,
  withTabBar = false,
  extraBottomSpace = 0,
  contentStyle,
  ...rest
}: ScreenScrollProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const paddingBottom =
    insets.bottom + spacing.xxl + extraBottomSpace + (withTabBar ? TAB_BAR_HEIGHT : 0);

  return (
    // Animated.ScrollView so a screen can drive a collapsing header off the
    // scroll position on the native thread. It takes every ScrollView prop, so
    // screens that do not animate anything behave exactly as before.
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      // Lets a swipe dismiss the keyboard on iOS the way users expect.
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentInsetAdjustmentBehavior="never"
      {...rest}
      contentContainerStyle={[
        { paddingBottom },
        styles.column,
        contentStyle,
        rest.contentContainerStyle,
      ]}
    >
      {children}
    </Animated.ScrollView>
  );
}

/**
 * Bottom padding for `FlatList`/`SectionList` content, matching `ScreenScroll`.
 * Lists get their own helper because they need the value, not a wrapper.
 */
export function useListBottomPadding(withTabBar = false, extra = 0): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + spacing.xxl + extra + (withTabBar ? TAB_BAR_HEIGHT : 0);
}

/**
 * Opaque band behind the status bar, drawn above the scroll content.
 *
 * Screens whose gradient header lives *inside* the ScrollView (Home, Reports)
 * would otherwise scroll it away, leaving the light status-bar icons over a
 * pale background where they cannot be read. This keeps that strip dark at
 * every scroll offset. Screens with a fixed `AppHeader` do not need it — the
 * header already paints there.
 */
export function StatusBarScrim({ color }: { color?: string }) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  if (insets.top === 0) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrim,
        { height: insets.top, backgroundColor: color ?? colors.headerGradient[0] },
      ]}
    />
  );
}

/**
 * A footer pinned above the home indicator — used for "Save Entry" and similar
 * primary actions that must always be reachable with one thumb.
 */
export function DockedFooter({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs },
        style,
      ]}
    >
      <View style={styles.footerInner}>{children}</View>
    </View>
  );
}

/**
 * Content-width style for `FlatList`/`SectionList` contentContainerStyle, so
 * lists centre on wide screens exactly like `ScreenScroll` does.
 */
export function useListContentStyle() {
  return useStyles().column;
}

const useStyles = makeStyles((colors) => ({
  root: {
    flex: 1,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  column: contentColumn,
  footerInner: contentColumn,
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
}));
