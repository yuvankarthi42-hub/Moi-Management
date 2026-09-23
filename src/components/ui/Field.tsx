import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import {
  Pressable, StyleSheet, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';

import { colors, makeStyles, radius, spacing, typography, useColors } from '../../theme';
import { T } from './Text';

export interface FieldProps extends TextInputProps {
  label?: string;
  /** Validation message shown under the input; also turns the border red. */
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Fixed prefix inside the input, e.g. the rupee sign on amount fields. */
  prefix?: string;
  rightAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string };
  containerStyle?: ViewStyle;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  {
    label, error, hint, required, leftIcon, prefix, rightAction, containerStyle, style, ...rest
  },
  ref,
) {
  const styles = useStyles();
  const colors = useColors();

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <T variant="smallStrong" tone="secondary" style={styles.label}>
          {label}
          {required ? <T variant="smallStrong" tone="danger"> *</T> : null}
        </T>
      ) : null}

      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        {leftIcon ? (
          <Ionicons name={leftIcon} size={18} color={colors.textMuted} style={styles.leftIcon} />
        ) : null}
        {prefix ? (
          <T variant="bodyStrong" tone="secondary" style={styles.prefix}>
            {prefix}
          </T>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          // Keeps Android's underline from doubling up with our border.
          underlineColorAndroid="transparent"
          {...rest}
        />
        {rightAction ? (
          <Pressable
            onPress={rightAction.onPress}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={rightAction.label}
            style={({ pressed }) => [styles.rightAction, pressed && styles.pressed]}
          >
            <Ionicons name={rightAction.icon} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <T variant="caption" tone="danger" style={styles.helper}>
          {error}
        </T>
      ) : hint ? (
        <T variant="caption" tone="muted" style={styles.helper}>
          {hint}
        </T>
      ) : null}
    </View>
  );
});

/**
 * A field-shaped button that opens a picker (person, date, function type).
 * Looks identical to `Field` so forms read as one consistent column.
 */
export function PickerField({
  label,
  value,
  placeholder,
  onPress,
  onClear,
  leftIcon,
  error,
  required,
  containerStyle,
}: {
  label?: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
  onClear?: () => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <T variant="smallStrong" tone="secondary" style={styles.label}>
          {label}
          {required ? <T variant="smallStrong" tone="danger"> *</T> : null}
        </T>
      ) : null}

      {/* The clear control is a sibling of the opener, not a child of it:
          nesting two buttons is invalid on web and ambiguous to screen
          readers, which would announce one target inside the other. */}
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`${label ?? placeholder}. ${value ?? 'Not set'}`}
          style={({ pressed }) => [styles.pickerOpener, pressed && styles.pressed]}
        >
          {leftIcon ? (
            <Ionicons name={leftIcon} size={18} color={colors.textMuted} style={styles.leftIcon} />
          ) : null}
          <T
            variant="body"
            tone={value ? 'default' : 'muted'}
            style={styles.pickerValue}
            numberOfLines={1}
          >
            {value || placeholder}
          </T>
          {value && onClear ? null : (
            <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
          )}
        </Pressable>

        {value && onClear ? (
          <Pressable
            onPress={onClear}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label ?? placeholder}`}
            style={({ pressed }) => [styles.rightAction, pressed && styles.pressed]}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <T variant="caption" tone="danger" style={styles.helper}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
    // Android adds its own vertical padding; zero it so the row height is ours.
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  prefix: {
    marginRight: spacing.xs,
  },
  rightAction: {
    // Padded out to a 44pt target rather than the icon's own 18pt.
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOpener: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  pickerValue: {
    flex: 1,
  },
  helper: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
}));
