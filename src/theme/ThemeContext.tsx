import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type Palette } from './colors';
import type { ThemePreference } from '../domain/models';

interface ThemeValue {
  colors: Palette;
  /** The resolved scheme, after applying "system". */
  scheme: 'light' | 'dark';
  isDark: boolean;
}

// Defaults to light so a component rendered outside the provider (a test, a
// modal portal) still gets a usable palette rather than throwing.
const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  scheme: 'light',
  isDark: false,
});

export function ThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();

  const value = useMemo<ThemeValue>(() => {
    const scheme: 'light' | 'dark' =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return {
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      isDark: scheme === 'dark',
    };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

/** The active palette. Use this instead of importing `colors` directly. */
export function useColors(): Palette {
  return useContext(ThemeContext).colors;
}
