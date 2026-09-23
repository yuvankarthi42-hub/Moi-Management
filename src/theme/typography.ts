import { Platform, TextStyle } from 'react-native';

const family = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

const familyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'system-ui',
});

type Variant = TextStyle;

/**
 * Text ramp. `fontWeight` is kept alongside the Android-specific family so
 * medium weights render correctly on both platforms.
 */
/**
 * Sizes sit a notch above where they started: body at 16 matches Material's
 * body scale, and captions clear 12, below which small print stops being
 * readable at arm's length — which is how this app is used, standing at a moi
 * table. Line heights keep roughly a 1.4 ratio so denser text still breathes.
 */
export const typography = {
  display: { fontFamily: familyMedium, fontSize: 32, lineHeight: 38, fontWeight: '700' } as Variant,
  h1: { fontFamily: familyMedium, fontSize: 26, lineHeight: 32, fontWeight: '700' } as Variant,
  h2: { fontFamily: familyMedium, fontSize: 22, lineHeight: 28, fontWeight: '700' } as Variant,
  h3: { fontFamily: familyMedium, fontSize: 18, lineHeight: 24, fontWeight: '600' } as Variant,
  bodyStrong: { fontFamily: familyMedium, fontSize: 16, lineHeight: 22, fontWeight: '600' } as Variant,
  body: { fontFamily: family, fontSize: 16, lineHeight: 22, fontWeight: '400' } as Variant,
  small: { fontFamily: family, fontSize: 14, lineHeight: 19, fontWeight: '400' } as Variant,
  smallStrong: { fontFamily: familyMedium, fontSize: 14, lineHeight: 19, fontWeight: '600' } as Variant,
  caption: { fontFamily: family, fontSize: 12, lineHeight: 16, fontWeight: '400' } as Variant,
  captionStrong: { fontFamily: familyMedium, fontSize: 12, lineHeight: 16, fontWeight: '600' } as Variant,
} as const;
