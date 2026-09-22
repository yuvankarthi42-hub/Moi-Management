import { ImageStyle, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { darkColors, lightColors, type Palette } from './colors';
import { useTheme } from './ThemeContext';

/**
 * Mirrors React Native's own `NamedStyles` constraint. Without it the object
 * literal passed to `makeStyles` is not contextually typed as a stylesheet, so
 * values like `flexDirection: 'row'` widen to `string` and stop compiling.
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Builds a stylesheet that follows the active theme.
 *
 * `StyleSheet.create` captures colour *values*, so a sheet defined at module
 * scope can never react to a theme change. This creates one sheet per palette
 * up front and hands back the right one — no per-render allocation, and screens
 * keep the familiar `styles.x` shape:
 *
 *   const useStyles = makeStyles((colors) => ({
 *     card: { backgroundColor: colors.surface },
 *   }));
 *
 *   // inside the component:
 *   const styles = useStyles();
 */
export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (colors: Palette) => T & NamedStyles<any>,
) {
  const light = StyleSheet.create(factory(lightColors));
  const dark = StyleSheet.create(factory(darkColors));

  return function useStyles(): T {
    return useTheme().isDark ? dark : light;
  };
}
