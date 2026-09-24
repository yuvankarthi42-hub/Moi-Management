import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { colors, makeStyles, spacing } from '../../theme';
import { Sheet } from '../ui/Sheet';
import { T } from '../ui/Text';

export interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
  emoji?: string;
}

/** Single-choice sheet used for function type, village, year and so on. */
export function OptionPicker<T extends string>({
  visible,
  onClose,
  onSelect,
  options,
  selected,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: T) => void;
  options: Option<T>[];
  selected?: T;
  title: string;
}) {
  const styles = useStyles();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              android_ripple={{ color: colors.primarySoft }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              {option.emoji ? (
                <T style={styles.emoji} allowFontScaling={false}>
                  {option.emoji}
                </T>
              ) : null}
              <View style={styles.body}>
                <T variant="body" tone={active ? 'primary' : 'default'} numberOfLines={1}>
                  {option.label}
                </T>
                {option.description ? (
                  <T variant="caption" tone="muted" numberOfLines={1}>
                    {option.description}
                  </T>
                ) : null}
              </View>
              {active ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  scroll: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    flex: 1,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
}));
