import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { DateField } from '../../src/components/app/DateField';
import { OptionPicker } from '../../src/components/app/OptionPicker';
import { AppHeader, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, T, useToast } from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { FUNCTION_TYPES, functionTypeMeta } from '../../src/domain/functionTypes';
import type { FunctionType, ISODate } from '../../src/domain/models';
import { selectVillages } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing } from '../../src/theme';
import { toISODate } from '../../src/utils/date';

/**
 * Creates a function, or edits one when `?id=` is present — the fields are
 * identical, so one screen serves both and there is a single source of truth
 * for the validation messages.
 */
export default function FunctionFormScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, addFunction, editFunction } = useAppData();
  const { showToast } = useToast();

  const existing = useMemo(() => data.functions.find((f) => f.id === id), [data.functions, id]);
  const villages = useMemo(() => selectVillages(data), [data]);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<FunctionType>('wedding');
  const [date, setDate] = useState<ISODate>(toISODate(new Date()));
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [village, setVillage] = useState('');
  const [host, setHost] = useState('');
  const [notes, setNotes] = useState('');
  const [coverImage, setCoverImage] = useState<string | undefined>();

  const [typeOpen, setTypeOpen] = useState(false);
  const [villageOpen, setVillageOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Load the record being edited once it resolves from the store.
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setType(existing.type);
    setDate(existing.date);
    setTime(existing.time ?? '');
    setVenue(existing.venue ?? '');
    setVillage(existing.village ?? '');
    setHost(existing.host ?? '');
    setNotes(existing.notes ?? '');
    setCoverImage(existing.coverImage);
  }, [existing]);

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to choose a cover picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) setCoverImage(result.assets[0].uri);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    const payload = {
      title,
      type,
      date,
      time: time || undefined,
      venue: venue || undefined,
      village: village || undefined,
      notes: notes || undefined,
      coverImage,
      host: host || undefined,
      photos: existing?.photos ?? [],
    };

    try {
      if (existing) {
        await editFunction(existing.id, payload);
        showToast({ message: `${payload.title} updated` });
        router.back();
      } else {
        const newId = await addFunction(payload);
        showToast({ message: `${payload.title} created` });
        // Replace so Back from the detail screen returns to the list, not the form.
        router.replace(`/function/${newId}`);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.field ?? 'title']: error.message });
      } else {
        Alert.alert('Could not save', 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader
        title={existing ? 'Edit Function' : 'Add Function'}
        showBack
        onBack={() => router.back()}
      />

      <KeyboardForm>
        <Pressable
          onPress={pickCover}
          accessibilityRole="button"
          accessibilityLabel="Choose a cover photo"
          style={({ pressed }) => [styles.cover, pressed && styles.pressed]}
        >
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={styles.coverEmpty}>
              <Ionicons name="image-outline" size={26} color={colors.textMuted} />
              <T variant="caption" tone="muted">
                Add a cover photo (optional)
              </T>
            </View>
          )}
        </Pressable>

        <Field
          label="Function name"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="Karthick Wedding"
          error={errors.title}
          autoCapitalize="words"
        />

        <PickerField
          label="Function type"
          required
          value={`${functionTypeMeta(type).emoji}  ${functionTypeMeta(type).label}`}
          placeholder="Choose type"
          onPress={() => setTypeOpen(true)}
        />

        <DateField label="Date" required value={date} onChange={setDate} error={errors.date} />

        <Field
          label="Time (optional)"
          value={time}
          onChangeText={setTime}
          placeholder="10:00 AM"
          autoCapitalize="characters"
        />

        <Field
          label="Venue (optional)"
          value={venue}
          onChangeText={setVenue}
          placeholder="Sri Lakshmi Mahal, Tenkasi"
          autoCapitalize="words"
        />

        <PickerField
          label="Village (optional)"
          value={village || undefined}
          placeholder="Choose or leave blank"
          leftIcon="location-outline"
          onPress={() => setVillageOpen(true)}
          onClear={village ? () => setVillage('') : undefined}
        />

        <Field
          label="Host (optional)"
          value={host}
          onChangeText={setHost}
          placeholder="Karthick"
          autoCapitalize="words"
        />

        {/* Expenses are their own records against this function (spec §14),
            so they are added from the function's Expenses tab, not here. */}

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="We are happy to invite you and your family."
          multiline
          numberOfLines={3}
          style={styles.notes}
        />
      </KeyboardForm>

      <DockedFooter>
        <Button
          label={existing ? 'Save Changes' : 'Create Function'}
          size="lg"
          block
          loading={saving}
          onPress={save}
        />
      </DockedFooter>

      <OptionPicker
        visible={typeOpen}
        onClose={() => setTypeOpen(false)}
        title="Function type"
        selected={type}
        options={FUNCTION_TYPES.map((t) => ({
          value: t.value,
          label: t.label,
          description: t.labelTa,
          emoji: t.emoji,
        }))}
        onSelect={(value) => {
          setType(value);
          setTypeOpen(false);
        }}
      />

      <OptionPicker
        visible={villageOpen}
        onClose={() => setVillageOpen(false)}
        title="Village"
        selected={village}
        options={villages.map((v) => ({ value: v, label: v }))}
        onSelect={(value) => {
          setVillage(value);
          setVillageOpen(false);
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  cover: {
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pairRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pairItem: {
    flex: 1,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.8,
  },
}));
