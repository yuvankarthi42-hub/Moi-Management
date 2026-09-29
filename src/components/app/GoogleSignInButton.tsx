import React from 'react';
import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { makeStyles, radius, shadow, spacing, typography } from '../../theme';

/**
 * Google's own mark, in Google's own four colours.
 *
 * Drawn rather than taken from the icon font: `Ionicons.logo-google` is a
 * single-colour glyph, and the G is recognised by its colours more than by its
 * shape. The paths are the standard 48×48 logo.
 */
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

/**
 * "Continue with Google", in Google's light button style.
 *
 * Its own component rather than the app's `Button` with an icon, for two
 * reasons. The shared button takes an Ionicons glyph name, and widening it to
 * accept an arbitrary node for one screen would push a one-off into everything
 * that uses it. And the styling is not ours to choose: Google's sign-in
 * branding sets a white surface, a near-black label and the mark at a fixed
 * size, so the coloured G never sits on a coloured fill.
 *
 * The height and corner radius are the app's own, so it still belongs on the
 * landing screen next to everything else.
 */
export function GoogleSignInButton({
  label = 'Continue with Google',
  onPress,
  loading = false,
  disabled = false,
  style,
}: {
  label?: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const inert = disabled || loading;

  return (
    <Pressable
      onPress={inert ? undefined : onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        inert && styles.inert,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={GOOGLE_BLUE} />
      ) : (
        <GoogleMark size={20} />
      )}
      {/* The label keeps its own dark colour in both themes: the button is
          white in Google's spec, so it is not a surface the palette owns. */}
      <Text style={styles.label} numberOfLines={1} allowFontScaling>
        {label}
      </Text>
    </Pressable>
  );
}

const GOOGLE_BLUE = '#4285F4';
/** Google's prescribed label colour for the light button. */
const GOOGLE_LABEL = '#1F1F1F';
const GOOGLE_BORDER = '#DADCE0';

const useStyles = makeStyles(() => ({
  button: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    // The mark and the label are centred as a pair rather than the label being
    // centred in what the mark leaves. A balancing spacer opposite the mark
    // would read tidier but costs about 36px, and on a narrow phone that is
    // the difference between the whole label and "Continue with \u2026".
    justifyContent: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: GOOGLE_BORDER,
    backgroundColor: '#FFFFFF',
    ...shadow(1),
  },
  pressed: {
    // Google's own pressed state for the light button: the surface dims
    // slightly rather than the whole control fading.
    backgroundColor: '#F7F8F8',
  },
  inert: {
    opacity: 0.6,
  },
  label: {
    flexShrink: 1,
    color: GOOGLE_LABEL,
    // Google's spec is 14sp; 16 keeps it legible in a 56pt button without
    // crowding the label out at phone width.
    fontSize: 16,
    fontWeight: typography.bodyStrong.fontWeight,
  },
}));
