import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { ISODate } from '../../domain/models';
import { spacing } from '../../theme';
import { formatDate, fromISODate, toISODate } from '../../utils/date';
import { Button } from '../ui/Button';
import { PickerField } from '../ui/Field';
import { Sheet } from '../ui/Sheet';

/**
 * Date input backed by the platform picker.
 *
 * Android's picker is a modal dialog that dismisses itself, so the value is
 * committed on change. iOS renders inline, so it goes in a sheet with an
 * explicit Done button — otherwise a spin with no confirmation feels unsafe.
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => (value ? fromISODate(value) : new Date()));

  const openPicker = () => {
    setDraft(value ? fromISODate(value) : new Date());
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type === 'set' && selected) onChange(toISODate(selected));
  };

  return (
    <>
      <PickerField
        label={label}
        value={value ? formatDate(value) : undefined}
        placeholder={placeholder}
        onPress={openPicker}
        leftIcon="calendar-outline"
        error={error}
        required={required}
      />

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draft}
          mode="date"
          display="default"
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {Platform.OS !== 'android' ? (
        <Sheet
          visible={open}
          onClose={() => setOpen(false)}
          title={label ?? 'Select date'}
          footer={
            <View style={styles.footer}>
              <Button
                label="Done"
                block
                onPress={() => {
                  onChange(toISODate(draft));
                  setOpen(false);
                }}
              />
            </View>
          }
        >
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={(_, selected) => selected && setDraft(selected)}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={styles.picker}
            />
          </View>
        </Sheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pickerWrap: {
    paddingHorizontal: spacing.lg,
  },
  picker: {
    alignSelf: 'stretch',
  },
  footer: {
    flexDirection: 'row',
  },
});
