import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../theme';

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  style,
  autoFocus,
  onSubmit,
  /** Use inside the purple header, where the text must be light. */
  onDark = false,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  autoFocus?: boolean;
  onSubmit?: () => void;
  onDark?: boolean;
}) {
  const fg = onDark ? colors.onPrimary : colors.text;
  const muted = onDark ? colors.onPrimaryMuted : colors.textMuted;

  return (
    <View style={[styles.wrap, onDark ? styles.wrapDark : styles.wrapLight, style]}>
      <Ionicons name="search" size={18} color={muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        style={[styles.input, { color: fg }]}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        clearButtonMode="never"
        underlineColorAndroid="transparent"
        // A light caret is only legible on the dark header.
        selectionColor={onDark ? colors.onPrimary : colors.primary}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  wrapLight: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  wrapDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  input: {
    flex: 1,
    ...typography.body,
    padding: 0,
  },
});
