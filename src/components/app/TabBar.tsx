import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT, TAB_FAB_SIZE, colors, contentColumn, makeStyles, radius, shadow, spacing, typography } from '../../theme';
import { T } from '../ui/Text';

export interface TabBarProps extends BottomTabBarProps {
  /** Invoked by the centre "+" button. */
  onCentrePress: () => void;
}

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', idle: 'home-outline' },
  functions: { active: 'calendar', idle: 'calendar-outline' },
  people: { active: 'people', idle: 'people-outline' },
  more: { active: 'grid', idle: 'grid-outline' },
};

const LABELS: Record<string, string> = {
  index: 'Home',
  functions: 'Functions',
  people: 'People',
  more: 'More',
};

/**
 * Bottom navigation with a raised centre action.
 *
 * The bar's height is `TAB_BAR_HEIGHT + bottom inset`, and the inset is applied
 * as padding — so the touch targets sit above the iPhone home indicator and
 * above Android's gesture bar, while the bar's background still fills to the
 * very bottom of the screen.
 */
export function TabBar({ state, navigation, onCentrePress }: TabBarProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  // Split the four routes around the centre button.
  const routes = state.routes.filter((r) => r.name in ICONS);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === index;
    const icon = ICONS[route.name];

    return (
      <Pressable
        key={route.key}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={LABELS[route.name]}
        android_ripple={{ color: colors.primarySoft, borderless: true, radius: 32 }}
        style={styles.tab}
      >
        <Ionicons
          name={focused ? icon.active : icon.idle}
          size={22}
          color={focused ? colors.primary : colors.textMuted}
        />
        <T
          style={[
            typography.caption,
            {
              color: focused ? colors.primary : colors.textMuted,
              fontWeight: focused ? '600' : '400',
            },
          ]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {LABELS[route.name]}
        </T>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.column}>
      <View style={styles.side}>{left.map(renderTab)}</View>

      <View style={styles.centreSlot}>
        <Pressable
          onPress={onCentrePress}
          accessibilityRole="button"
          accessibilityLabel="Add"
          android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true, radius: 30 }}
          style={({ pressed }) => [styles.fab, shadow(2), pressed && styles.fabPressed]}
        >
          <Ionicons name="add" size={30} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.side}>{right.map(renderTab)}</View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    // Lifts the bar above scroll content on iOS, where there is no elevation.
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -2 },
      },
      default: {},
    }),
  },
  column: {
    ...contentColumn,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    gap: 2,
  },
  centreSlot: {
    width: TAB_FAB_SIZE + spacing.lg,
    alignItems: 'center',
  },
  fab: {
    width: TAB_FAB_SIZE,
    height: TAB_FAB_SIZE,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Raises the button so it straddles the top edge of the bar.
    marginTop: -TAB_FAB_SIZE / 2.6,
    borderWidth: 4,
    borderColor: colors.background,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
}));
