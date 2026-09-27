import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { PersonPicker } from '../../src/components/app/PersonPicker';
import { DateField } from '../../src/components/app/DateField';
import {
  AppHeader, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, T, useToast,
} from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import type { ID, ISODate } from '../../src/domain/models';
import { selectFunctions, selectGiftNames } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, radius, spacing } from '../../src/theme';
import { formatDate, toISODate } from '../../src/utils/date';

/**
 * Records a gift, in either direction.
 *
 * `?return=1` switches it from a gift received at one of our functions to one
 * the household gave back at somebody else's event — the same form either way,
 * because it is the same act seen from the other side.
 *
 * The name is the only thing asked for. A gift is remembered as "the silver
 * bowl", not as a figure, and most never get a figure at all — so the value,
 * notes and photo live behind a disclosure that most entries never open.
 */
export default function GiftFormScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { showToast } = useToast();
  const { data, addGift, addGiftGiven } = useAppData();
  const params = useLocalSearchParams<{
    functionId?: string;
    personId?: string;
    return?: string;
  }>();

  const isReturn = params.return === '1';
  const functions = useMemo(() => selectFunctions(data), [data]);
  const giftNames = useMemo(() => selectGiftNames(data), [data]);

  const defaultFunctionId = useMemo(() => {
    if (params.functionId) return params.functionId;
    const upcoming = [...functions]
      .filter((f) => f.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0]?.id ?? functions[0]?.id;
  }, [functions, params.functionId]);

  const [functionId, setFunctionId] = useState<ID | undefined>(defaultFunctionId);
  const [personId, setPersonId] = useState<ID | undefined>(params.personId);
  const [name, setName] = useState('');
  const [occasion, setOccasion] = useState('');
  const [date, setDate] = useState<ISODate>(toISODate(new Date()));
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [functionOpen, setFunctionOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // The default function is only known once the dataset has loaded, and
  // `useState` keeps its first value — so adopt it once, without overriding a
  // real choice.
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (defaultApplied.current || functionId || !defaultFunctionId) return;
    defaultApplied.current = true;
    setFunctionId(defaultFunctionId);
  }, [defaultFunctionId, functionId]);

  const person = data.people.find((p) => p.id === personId);
  const fn = functions.find((f) => f.id === functionId);
  const numericValue = Number(value.replace(/[^\d]/g, '')) || undefined;

  const save = async () => {
    const next: Record<string, string> = {};
    if (!isReturn && !functionId) next.functionId = 'Choose which function this is for.';
    if (!personId) next.personId = isReturn ? 'Choose who you gave it to.' : 'Choose who gave it.';
    if (!name.trim()) next.name = 'Say what the gift was.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      if (isReturn) {
        await addGiftGiven({
          personId: personId!,
          name: name.trim(),
          occasion: occasion.trim() || undefined,
          date,
          value: numericValue,
          notes: notes.trim() || undefined,
        });
      } else {
        await addGift({
          functionId: functionId!,
          personId: personId!,
          name: name.trim(),
          value: numericValue,
          notes: notes.trim() || undefined,
        });
      }
      showToast({
        message: isReturn
          ? `${name.trim()} returned to ${person?.name ?? 'them'}`
          : `${name.trim()} from ${person?.name ?? 'them'} saved`,
      });
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.field ?? 'name']: error.message });
      } else {
        Alert.alert('Could not save', 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppHeader
        title={isReturn ? 'Return Gift' : 'Add Gift'}
        showBack
        onBack={() => router.back()}
      />

      <KeyboardForm>
        {isReturn ? (
          <>
            <PickerField
              label="Person"
              required
              value={person?.name}
              placeholder="Choose who you gave it to"
              leftIcon="person-outline"
              onPress={() => setPersonOpen(true)}
              onClear={person ? () => setPersonId(undefined) : undefined}
              error={errors.personId}
            />
            <Field
              label="Occasion (optional)"
              value={occasion}
              onChangeText={setOccasion}
              placeholder="Their daughter's wedding"
              leftIcon="calendar-outline"
            />
          </>
        ) : (
          <>
            <PickerField
              label="Function"
              required
              value={fn ? `${fn.title} · ${formatDate(fn.date)}` : undefined}
              placeholder="Choose function"
              leftIcon="calendar-outline"
              onPress={() => setFunctionOpen(true)}
              error={errors.functionId}
            />
            <PickerField
              label="Person"
              required
              value={person?.name}
              placeholder="Choose who gave it"
              leftIcon="person-outline"
              onPress={() => setPersonOpen(true)}
              onClear={person ? () => setPersonId(undefined) : undefined}
              error={errors.personId}
            />
          </>
        )}

        {/* The one required field, and the one the host is actually thinking
            about. Larger than the rest because it is the entry. */}
        <Field
          label={isReturn ? 'What you gave' : 'What was given'}
          required
          value={name}
          onChangeText={setName}
          placeholder="Silver bowl"
          autoCapitalize="sentences"
          leftIcon="gift-outline"
          error={errors.name}
          style={styles.nameInput}
        />

        {giftNames.length > 0 ? (
          <View style={styles.chipRow}>
            {giftNames.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setName(suggestion)}
                accessibilityRole="button"
                accessibilityLabel={`Set gift to ${suggestion}`}
                style={({ pressed }) => [
                  styles.chip,
                  name === suggestion && styles.chipActive,
                  pressed && styles.pressed,
                ]}
              >
                <T variant="smallStrong" tone={name === suggestion ? 'primary' : 'secondary'}>
                  {suggestion}
                </T>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isReturn ? (
          <DateField label="Date" value={date} onChange={setDate} />
        ) : null}

        {/* Folded away: none of it is required, and asking a host to price a
            set of vessels at the moi table is how entries stop getting made. */}
        <Pressable
          onPress={() => setDetailsOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: detailsOpen }}
          style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}
        >
          <T variant="smallStrong" tone="primary">
            {detailsOpen ? 'Hide details' : 'Add details — value, notes'}
          </T>
        </Pressable>

        {detailsOpen ? (
          <>
            <Field
              label="Value (optional)"
              prefix="₹"
              value={value}
              onChangeText={(text) => setValue(text.replace(/[^\d]/g, ''))}
              keyboardType="number-pad"
              placeholder="0"
              error={errors.value}
              hint="Never counted into moi collected."
            />
            <Field
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Happy wishes to Harthick"
              multiline
              numberOfLines={3}
              style={styles.notes}
            />
          </>
        ) : null}
      </KeyboardForm>

      <DockedFooter>
        <Button
          label={isReturn ? 'Save return gift' : 'Save gift'}
          size="lg"
          block
          loading={saving}
          onPress={save}
        />
      </DockedFooter>

      <OptionPicker
        visible={functionOpen}
        onClose={() => setFunctionOpen(false)}
        title="Choose function"
        selected={functionId}
        options={functions.map((f) => ({
          value: f.id,
          label: f.title,
          description: formatDate(f.date),
          emoji: functionTypeMeta(f.type).emoji,
        }))}
        onSelect={(chosen) => {
          setFunctionId(chosen);
          setFunctionOpen(false);
        }}
      />

      <PersonPicker
        visible={personOpen}
        onClose={() => setPersonOpen(false)}
        onSelect={(chosen) => {
          setPersonId(chosen);
          setPersonOpen(false);
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  nameInput: {
    fontSize: 17,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  disclosure: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  notes: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.6,
  },
}));
