import { Alert, Platform } from 'react-native';

/**
 * A yes/no confirmation that works on every platform.
 *
 * `react-native-web`'s Alert is `static alert() {}` — a no-op — so a screen
 * that calls `Alert.alert` with buttons silently does nothing in a browser and
 * the action never runs. Native keeps the real dialog; web falls back to
 * `window.confirm`, which is modal and returns the answer directly.
 *
 * Resolves true when the user confirms, false when they cancel or dismiss.
 */
export function confirmAction({
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    const confirmFn = (globalThis as { confirm?: (m?: string) => boolean }).confirm;
    // No window.confirm (SSR, or a browser that blocked it): say no rather than
    // run something the user never agreed to.
    if (!confirmFn) return Promise.resolve(false);
    return Promise.resolve(confirmFn(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
