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

/**
 * Widest the content column ever gets.
 *
 * The app is designed for a phone; on a tablet or a large foldable the layout
 * keeps that column and centres it, rather than stretching rows until a name
 * and its amount sit at opposite ends of the screen. Backgrounds still run
 * edge to edge — only the content is constrained.
 */
export const CONTENT_MAX_WIDTH = 560;

/** Centres a content column once the screen is wider than the phone layout. */
export const contentColumn = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center',
} as const;

/** Height of the bottom tab bar excluding the device's safe-area inset. */
export const TAB_BAR_HEIGHT = 60;

/** Diameter of the centre "add" action button that floats over the tab bar. */
export const TAB_FAB_SIZE = 56;

/**
 * The inset to apply for a given side — on web, the browser's own
 * `env(safe-area-inset-*)` rather than what `useSafeAreaInsets()` reports.
 *
 * On web the library has no native source for the insets: it reads the same
 * `env()` values off a hidden element's computed style, once on mount, and
 * relies on a CSS `transitionend` to notice a change. Writing `env()` into
 * the style directly skips that JS snapshot — the browser re-resolves it on
 * every layout, including a rotation or a late correction of the window
 * size — and cannot be stale. (A blank strip under the tab bar in the
 * installed iOS app was once blamed on this measurement; it was not — see
 * the status-bar note in `public/index.html`.)
 *
 * `inset` is still taken as a parameter (used as-is on native, where the
 * library's value is the real one) so call sites don't need an `if
 * (Platform.OS === 'web')` of their own.
 */
export function safeAreaFloor(
  inset: number,
  side: 'top' | 'bottom' | 'left' | 'right',
  /** Breathing room wanted *in addition* to the inset — e.g. the gap below
   * the status bar that a header keeps even on a device with no notch at
   * all. */
  extra = 0,
): number {
  if (Platform.OS !== 'web') return inset + extra;
  // A CSS function string in place of a number is a react-native-web escape
  // hatch: RN's own types only allow a number here, but react-native-web's
  // style engine passes a string straight through as real CSS, which is
  // exactly what `calc()`/`env()` need to be. The `0px` fallback only matters
  // on a browser that doesn't recognise the env var at all — every browser
  // that can install this as a PWA does.
  return `calc(env(safe-area-inset-${side}, 0px) + ${extra}px)` as unknown as number;
}
