import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { COUNTRY_CODES, countryByCode } from '../../auth';
import { makeStyles, radius, spacing, typography, useColors } from '../../theme';
import { T } from '../ui/Text';
import { OptionPicker } from './OptionPicker';

/**
 * Mobile number with its dialling code.
 *
 * The code and the number are one field visually but two values: a moi book
 * follows the family abroad, and a number is only unique once the code is on
 * it — so the code is picked, never typed into the number.
 */
export function PhoneField({
  countryCode,
  onChangeCountryCode,
  phone,
  onChangePhone,
  error,
  label = 'Mobile number',
  autoFocus,
}: {
  countryCode: string;
  onChangeCountryCode: (code: string) => void;
  phone: string;
  onChangePhone: (value: string) => void;
  error?: string;
  label?: string;
  autoFocus?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const country = countryByCode(countryCode);

  return (
    <View style={styles.wrap}>
      <T variant="smallStrong" tone="secondary" style={styles.label}>
        {label} <T variant="smallStrong" tone="danger">*</T>
      </T>

      <View style={[styles.row, error ? styles.rowError : null]}>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Country code, currently ${country.code} ${country.label}`}
          style={({ pressed }) => [styles.code, pressed && styles.pressed]}
        >
          <T variant="body" allowFontScaling={false}>
            {country.flag}
          </T>
          <T variant="bodyStrong" style={styles.codeText}>
            {country.code}
          </T>
          <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          value={phone}
          onChangeText={(value) => onChangePhone(value.replace(/[^0-9]/g, ''))}
          placeholder={'9'.repeat(Math.min(country.digits, 10))}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          maxLength={country.digits + 4}
          autoFocus={autoFocus}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      {error ? (
        <T variant="caption" tone="danger" style={styles.error}>
          {error}
        </T>
      ) : null}

      <OptionPicker
        visible={open}
        onClose={() => setOpen(false)}
        title="Country code"
        selected={countryCode}
        options={COUNTRY_CODES.map((c) => ({
          value: c.code,
          label: `${c.flag}  ${c.label}`,
          description: c.code,
        }))}
        onSelect={(value) => {
          onChangeCountryCode(value);
          setOpen(false);
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  rowError: {
    borderColor: colors.danger,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    // Matches the row's minHeight so the whole code block is one 52pt target.
    minWidth: 96,
  },
  codeText: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    ...typography.body,
  },
  error: {
    marginTop: spacing.xs,
  },
}));
