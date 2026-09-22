import { Image } from 'expo-image';
import React from 'react';
import { ImageStyle, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { avatarPalette, colors, makeStyles, radius, typography, useColors } from '../../theme';
import { hashToIndex, initials } from '../../utils/format';

/**
 * Circular avatar. Falls back to colour-coded initials, with the colour derived
 * from the person's id so it stays the same on every screen.
 */
export function Avatar({
  name,
  uri,
  size = 44,
  seed,
  style,
  emoji,
  backgroundColor,
}: {
  name: string;
  uri?: string;
  size?: number;
  /** Colour seed — pass the person's id so the colour is stable. */
  seed?: string;
  style?: ViewStyle & ImageStyle;
  /** Renders an emoji instead of initials (used for function-type badges). */
  emoji?: string;
  backgroundColor?: string;
}) {
  const styles = useStyles();
  const bg =
    backgroundColor ?? avatarPalette[hashToIndex(seed ?? name, avatarPalette.length)];
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[dimension, styles.image, style as ImageStyle]}
        contentFit="cover"
        transition={120}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View style={[dimension, styles.fallback, { backgroundColor: bg }, style]}>
      <Text
        style={[
          emoji ? styles.emoji : typography.bodyStrong,
          { fontSize: emoji ? size * 0.46 : size * 0.36, color: '#FFFFFF' },
        ]}
        allowFontScaling={false}
      >
        {emoji ?? initials(name)}
      </Text>
    </View>
  );
}

/** Square-ish tile used for function icons in lists. */
export function IconTile({
  emoji,
  tint,
  size = 46,
  style,
}: {
  emoji: string;
  tint: string;
  size?: number;
  style?: ViewStyle;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: `${tint}1A`,
        },
        styles.fallback,
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.46 }} allowFontScaling={false}>
        {emoji}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: colors.primarySoft,
  },
  emoji: {
    textAlign: 'center',
  },
}));
