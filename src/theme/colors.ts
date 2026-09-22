/**
 * Colour tokens for Moi Manager.
 *
 * The palette is anchored on a deep festive purple (used across every header
 * and primary action) with warm accents that echo traditional Tamil function
 * decor. Every value here is referenced through `theme.colors` — screens must
 * never hard-code a hex value.
 */
/** The colour contract both palettes satisfy. */
export interface Palette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  primarySofter: string;
  /** Two-stop gradient for headers. */
  headerGradient: readonly [string, string];
  /** Three-stop gradient for the splash screen. */
  splashGradient: readonly [string, string, string];
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  onPrimary: string;
  onPrimaryMuted: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  amountOut: string;
  amountIn: string;
  gold: string;
  shadow: string;
  overlay: string;
}

export const lightColors: Palette = {
  // Brand — the palette specified in the brief (§2).
  primary: '#2D198F',
  primaryDark: '#18095A',
  primaryLight: '#3F20B5',
  primarySoft: '#E7E3F7',
  primarySofter: '#F3F1FB',

  /** Gradient used by the app header / splash. */
  headerGradient: ['#18095A', '#3F20B5'] as const,
  splashGradient: ['#120544', '#18095A', '#2D198F'] as const,

  // Surfaces
  background: '#F8F8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#FBFBFE',
  border: '#E8E5EF',
  borderStrong: '#D6D2E4',

  // Text
  text: '#171717',
  textSecondary: '#525252',
  textMuted: '#737373',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#C9C0EC',

  // Semantic
  success: '#159447',
  successSoft: '#E3F5EA',
  danger: '#E53935',
  dangerSoft: '#FDECEC',
  warning: '#D98014',
  warningSoft: '#FCF2E3',
  info: '#2563EB',
  infoSoft: '#E6EDFD',

  /** Money that flows out of the household (moi we gave). */
  amountOut: '#E53935',
  /** Money that flows in (moi collected). */
  amountIn: '#159447',

  // Misc — accent gold is the reference design's function-icon colour.
  gold: '#F4C542',
  shadow: '#18095A',
  overlay: 'rgba(10, 4, 38, 0.45)',
};

/** Deterministic avatar background colours for people without a photo. */
export const avatarPalette = [
  '#3F20B5', '#159447', '#D98014', '#2563EB',
  '#C2185B', '#0891B2', '#B8860B', '#6D28D9',
] as const;

/**
 * Dark palette.
 *
 * It mirrors every key in the light palette so the two are interchangeable.
 * Surfaces are lifted (background darkest, cards a step lighter) rather than
 * inverted, and the brand purple is brightened — #2D198F on near-black fails
 * contrast, so dark mode uses the lighter brand tone as its primary.
 */
export const darkColors: Palette = {
  primary: '#8B7BE8',
  primaryDark: '#2D198F',
  primaryLight: '#A99CF0',
  primarySoft: '#2A2450',
  primarySofter: '#221D42',

  headerGradient: ['#150A3E', '#2D198F'] as const,
  splashGradient: ['#0B0424', '#150A3E', '#2D198F'] as const,

  background: '#0E0B1A',
  surface: '#191527',
  surfaceAlt: '#211C33',
  border: '#2C2740',
  borderStrong: '#3B3553',

  text: '#F4F3F8',
  textSecondary: '#B9B5C9',
  textMuted: '#8B87A0',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#C9C0EC',

  success: '#3FCB7C',
  successSoft: '#12301F',
  danger: '#FF6B66',
  dangerSoft: '#3A1A19',
  warning: '#F0A53C',
  warningSoft: '#3A2A12',
  info: '#6E9BFF',
  infoSoft: '#17203A',

  amountOut: '#FF6B66',
  amountIn: '#3FCB7C',

  gold: '#F4C542',
  shadow: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

/**
 * The light palette, exported under its original name.
 *
 * Kept so non-themed call sites (and the static parts of the design system)
 * keep working; anything that must follow the user's theme reads `useColors()`
 * or builds its styles with `makeStyles`.
 */
export const colors = lightColors;
