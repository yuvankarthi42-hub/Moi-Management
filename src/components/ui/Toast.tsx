import { Ionicons } from '@expo/vector-icons';
import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, radius, shadow, spacing, TAB_BAR_HEIGHT, useColors } from '../../theme';
import { T } from './Text';

export type ToastVariant = 'success' | 'error' | 'info' | 'destructive';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Optional single action, e.g. Undo. Tapping it dismisses the toast. */
  action?: { label: string; onPress: () => void };
  /** Milliseconds on screen. Defaults to 3s, or 5s when there is an action. */
  duration?: number;
  /** Lifts the toast above the tab bar. Screens without one pass false. */
  aboveTabBar?: boolean;
}

interface ToastValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastValue>({
  showToast: () => undefined,
  hideToast: () => undefined,
});

const ICONS: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  destructive: 'trash',
};

/**
 * Transient confirmation for a completed action.
 *
 * Success is deliberately *not* a blocking alert: recording moi at a function
 * means dozens of saves in a row, and an OK button on each would be punishing.
 * Destructive actions still confirm *before* running — this only reports what
 * already happened, and offers Undo where the action is cheap to reverse.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(undefined);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    // A new toast replaces the current one rather than queueing: the latest
    // action is the one the user just took, so it is the one worth reading.
    setToast(options);
    const duration = options.duration ?? (options.action ? 5000 : 3000);
    timer.current = setTimeout(() => setToast(undefined), duration);
    AccessibilityInfo.announceForAccessibility?.(options.message);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView toast={toast} onDismiss={hideToast} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastOptions; onDismiss: () => void }) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [toast, slide]);

  const tint =
    toast.variant === 'error' || toast.variant === 'destructive'
      ? colors.danger
      : toast.variant === 'info'
        ? colors.info
        : colors.success;

  const bottom =
    insets.bottom + spacing.lg + (toast.aboveTabBar === false ? 0 : TAB_BAR_HEIGHT);

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={[
        styles.wrap,
        { bottom },
        {
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <View style={[styles.toast, shadow(3)]}>
        <Ionicons name={ICONS[toast.variant ?? 'success']} size={19} color={tint} />
        <T variant="small" tone="onPrimary" style={styles.message} numberOfLines={2}>
          {toast.message}
        </T>

        {toast.action ? (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              onDismiss();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            style={styles.action}
          >
            <T variant="smallStrong" color={colors.primaryLight}>
              {toast.action.label}
            </T>
          </Pressable>
        ) : (
          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={17} color={colors.onPrimaryMuted} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastValue {
  return useContext(ToastContext);
}

const useStyles = makeStyles(() => ({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 520,
    // A single dark surface in both themes, so the toast always reads as an
    // overlay rather than blending into the page behind it.
    backgroundColor: '#211C33',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  message: {
    flex: 1,
  },
  action: {
    paddingHorizontal: spacing.xs,
  },
}));
