import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, ScrollViewProps } from 'react-native';

import { makeStyles, spacing } from '../../theme';

/**
 * Scrollable form body that stays clear of the keyboard.
 *
 * Screens draw their own `AppHeader` inside the layout (the navigator header is
 * hidden), so no vertical offset is needed: iOS gets `padding` behaviour and
 * Android relies on `adjustResize`, which Expo sets by default — adding
 * `padding` there too would shift the content twice.
 */
export function KeyboardForm({
  children,
  contentContainerStyle,
  ...rest
}: ScrollViewProps & { children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...rest}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
}));
