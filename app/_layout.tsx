import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDataProvider, useAppData } from '../src/store/AppDataProvider';
import { colors } from '../src/theme';

// Keep the native splash up until the dataset is in memory, so a cold start or
// a deep link never shows a screen full of zeroes for a frame.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * App shell.
 *
 * `SafeAreaProvider` must wrap everything so each screen can read the device's
 * insets. The navigator's own header is hidden throughout — screens draw the
 * purple `AppHeader`, which bleeds under the status bar by design.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppDataProvider>
          {/* Light icons, because every screen's top area is deep purple. */}
          <StatusBar style="light" />
          <SplashGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="moi/add"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="function/new"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="person/new"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </Stack>
        </AppDataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Dismisses the native splash once the first load finishes (or fails). */
function SplashGate() {
  const { loading, error } = useAppData();

  useEffect(() => {
    if (!loading || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [loading, error]);

  return null;
}
