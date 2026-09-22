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
export const typography = {
  display: { fontFamily: familyMedium, fontSize: 30, lineHeight: 36, fontWeight: '700' } as Variant,
  h1: { fontFamily: familyMedium, fontSize: 24, lineHeight: 30, fontWeight: '700' } as Variant,
  h2: { fontFamily: familyMedium, fontSize: 20, lineHeight: 26, fontWeight: '700' } as Variant,
  h3: { fontFamily: familyMedium, fontSize: 17, lineHeight: 23, fontWeight: '600' } as Variant,
  bodyStrong: { fontFamily: familyMedium, fontSize: 15, lineHeight: 21, fontWeight: '600' } as Variant,
  body: { fontFamily: family, fontSize: 15, lineHeight: 21, fontWeight: '400' } as Variant,
  small: { fontFamily: family, fontSize: 13, lineHeight: 18, fontWeight: '400' } as Variant,
  smallStrong: { fontFamily: familyMedium, fontSize: 13, lineHeight: 18, fontWeight: '600' } as Variant,
  caption: { fontFamily: family, fontSize: 11, lineHeight: 15, fontWeight: '400' } as Variant,
  captionStrong: { fontFamily: familyMedium, fontSize: 11, lineHeight: 15, fontWeight: '600' } as Variant,
} as const;
