/**
 * Colour tokens for Moi Manager.
 *
 * The palette is anchored on a deep festive purple (used across every header
 * and primary action) with warm accents that echo traditional Tamil function
 * decor. Every value here is referenced through `theme.colors` — screens must
 * never hard-code a hex value.
 */
export const colors = {
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
} as const;

/** Deterministic avatar background colours for people without a photo. */
export const avatarPalette = [
  '#3F20B5', '#159447', '#D98014', '#2563EB',
  '#C2185B', '#0891B2', '#B8860B', '#6D28D9',
] as const;
