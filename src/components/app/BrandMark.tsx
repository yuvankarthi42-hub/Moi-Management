import { Image } from 'expo-image';
import React from 'react';

/**
 * The app's mark: a lotus mandala around a hand dropping moi into the book.
 *
 * The same artwork is the app icon. This copy has the artwork's backdrop keyed
 * out, so it composites onto the launch screen's gradient rather than sitting
 * on a square of its own; Metro picks the 1x/2x/3x file for the device.
 */
export function BrandMark({ size = 232 }: { size?: number }) {
  return (
    <Image
      source={require('../../../assets/brand-mark.png')}
      style={{ width: size, height: size }}
      contentFit="contain"
      // The launch screen is the first thing drawn, so decode it eagerly rather
      // than fading it in after the title has already appeared.
      transition={0}
      accessibilityLabel="Moi Manager"
    />
  );
}
