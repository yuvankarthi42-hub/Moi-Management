import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles, radius, spacing, useColors } from '../../theme';
import { Field, type FieldProps } from '../ui/Field';
import { T } from '../ui/Text';

/**
 * A text field that suggests what has been typed before.
 *
 * The suggestions only appear once there is something to narrow them with, and
 * only while the field has focus — a list of every village on file sits under
 * the field taking a third of the form to say nothing, and grows as the
 * household does. Typed freely, so a name nobody has used yet is never blocked.
 */
export function SuggestField({
  suggestions,
  value,
  onChangeText,
  limit = 5,
  ...fieldProps
}: Omit<FieldProps, 'value' | 'onChangeText'> & {
  suggestions: string[];
  value: string;
  onChangeText: (value: string) => void;
  /** Most this will ever show at once, so it cannot bury the rest of the form. */
  limit?: number;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return suggestions
      .filter((s) => {
        const name = s.toLowerCase();
        // An exact match has nothing left to offer — the field already says it.
        return name !== query && name.includes(query);
      })
      // A name that starts with what was typed is the likelier one meant.
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(query) ? 0 : 1;
        return aStarts - bStarts || a.localeCompare(b);
      })
      .slice(0, limit);
  }, [suggestions, value, limit]);

  const open = focused && matches.length > 0;

  return (
    <View style={open ? styles.wrapOpen : undefined}>
      <Field
        {...fieldProps}
        value={value}
        onChangeText={onChangeText}
        onFocus={(e) => {
          setFocused(true);
          fieldProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          // A tap on a suggestion blurs the input first, so let the press land.
          setTimeout(() => setFocused(false), 120);
          fieldProps.onBlur?.(e);
        }}
        containerStyle={open ? styles.fieldOpen : fieldProps.containerStyle}
      />

      {open ? (
        <View style={styles.list}>
          {matches.map((match, index) => (
            <Pressable
              key={match}
              onPress={() => {
                onChangeText(match);
                setFocused(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Use ${match}`}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.rowDivider,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="return-down-forward" size={15} color={colors.textMuted} />
              <T variant="body" numberOfLines={1}>
                {match}
              </T>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrapOpen: {
    marginBottom: spacing.lg,
  },
  fieldOpen: {
    // The list carries the gap while it is open, so the field gives up its own.
    marginBottom: spacing.xs,
  },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
}));
