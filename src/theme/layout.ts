import { Platform } from 'react-native';

/** 4pt spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Cross-platform elevation. iOS gets a soft shadow, Android uses the native
 * elevation prop, web falls back to a box-shadow via shadow* props.
 */
export const shadow = (level: 1 | 2 | 3 = 1) => {
  const config = {
    1: { radius: 8, opacity: 0.06, offset: 2, elevation: 2 },
    2: { radius: 16, opacity: 0.09, offset: 4, elevation: 5 },
    3: { radius: 24, opacity: 0.14, offset: 8, elevation: 10 },
  }[level];

  return Platform.select({
    android: { elevation: config.elevation },
    default: {
      shadowColor: '#1B1442',
      shadowOpacity: config.opacity,
      shadowRadius: config.radius,
      shadowOffset: { width: 0, height: config.offset },
    },
  })!;
};

/** Height of the bottom tab bar excluding the device's safe-area inset. */
export const TAB_BAR_HEIGHT = 60;

/** Diameter of the centre "add" action button that floats over the tab bar. */
export const TAB_FAB_SIZE = 56;
