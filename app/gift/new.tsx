import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { PersonPicker } from '../../src/components/app/PersonPicker';
import { SuggestField } from '../../src/components/app/SuggestField';
import { DateField } from '../../src/components/app/DateField';
import {
  AppHeader, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, T, useToast,
} from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import type { ID, ISODate } from '../../src/domain/models';
import { selectFunctions, selectGiftNames } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, radius, spacing, useColors } from '../../src/theme';
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
  const colors = useColors();
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
  const giftNames = useMemo(() => selectGiftNames(data, 40), [data]);

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
  const [photoUri, setPhotoUri] = useState<string | undefined>();

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

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

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
          photoUri,
        });
      } else {
        await addGift({
          functionId: functionId!,
          personId: personId!,
          name: name.trim(),
          value: numericValue,
          notes: notes.trim() || undefined,
          photoUri,
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
            about. Names this household has used before are offered as it is
            typed, the way the village field works. */}
        <SuggestField
          label={isReturn ? 'What you gave' : 'What was given'}
          required
          value={name}
          onChangeText={setName}
          suggestions={giftNames}
          placeholder="Silver bowl"
          autoCapitalize="sentences"
          leftIcon="gift-outline"
          error={errors.name}
          style={styles.nameInput}
        />

        {isReturn ? (
          <DateField label="Date" value={date} onChange={setDate} />
        ) : null}

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

        <T variant="smallStrong" tone="secondary" style={styles.label}>
          Photo (optional)
        </T>
        <View style={styles.photoRow}>
          <Pressable
            onPress={pickPhoto}
            accessibilityRole="button"
            accessibilityLabel="Attach a photo"
            style={({ pressed }) => [styles.photoBox, pressed && styles.pressed]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
            ) : (
              <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
            )}
          </Pressable>
          {photoUri ? (
            <Pressable onPress={() => setPhotoUri(undefined)} hitSlop={8}>
              <T variant="smallStrong" tone="danger">
                Remove
              </T>
            </Pressable>
          ) : (
            <T variant="caption" tone="muted" style={styles.photoHint}>
              A picture of the gift, for when the name alone stops being enough.
            </T>
          )}
        </View>
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
  label: {
    marginBottom: spacing.xs,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  photoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoHint: {
    flex: 1,
  },
  notes: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.6,
  },
}));
