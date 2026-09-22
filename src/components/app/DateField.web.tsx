import React from 'react';
import { View } from 'react-native';

import type { ISODate } from '../../domain/models';
import { makeStyles, radius, spacing, typography, useColors } from '../../theme';
import { toISODate } from '../../utils/date';
import { T } from '../ui/Text';

/**
 * Web implementation of `DateField`.
 *
 * `@react-native-community/datetimepicker` ships no web build — on a browser it
 * renders nothing, so the sheet opened empty and a date could not be chosen at
 * all. Metro picks this `.web.tsx` file for web builds and the native one
 * everywhere else, so phones keep the platform picker while the browser gets
 * the native `<input type="date">` (which brings its own calendar, keyboard
 * support and locale formatting for free).
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  required,
  minimumDate,
  maximumDate,
}: {
  label?: string;
  value?: ISODate;
  onChange: (date: ISODate) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}) {
  const styles = useStyles();
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      {label ? (
        <T variant="smallStrong" tone="secondary" style={styles.label}>
          {label}
          {required ? (
            <T variant="smallStrong" tone="danger">
              {' *'}
            </T>
          ) : null}
        </T>
      ) : null}

      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <input
          type="date"
          value={value ?? ''}
          onChange={(event) => {
            // An empty value means the user cleared the field; keep the last
            // valid date rather than writing an invalid one.
            if (event.target.value) onChange(event.target.value as ISODate);
          }}
          min={minimumDate ? toISODate(minimumDate) : undefined}
          max={maximumDate ? toISODate(maximumDate) : undefined}
          aria-label={label ?? placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: colors.text,
            fontSize: typography.body.fontSize,
            fontFamily: 'inherit',
            padding: 0,
            // Safari sizes date inputs oddly without this.
            minHeight: 22,
            colorScheme: colors.background === '#F8F8FC' ? 'light' : 'dark',
          }}
        />
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
  helper: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
}));
