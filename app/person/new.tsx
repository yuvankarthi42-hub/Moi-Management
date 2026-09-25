import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { AppHeader, Avatar, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, useToast } from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { selectVillages } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../../src/theme';

const RELATIONS = [
  'Mama', 'Athai', 'Chithappa', 'Periappa', 'Cousin', 'Friend',
  'Neighbour', 'Colleague', 'Relative', 'Other',
];

/** Creates a person, or edits one when `?id=` is present. */
export default function PersonFormScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const { data, addPerson, editPerson } = useAppData();
  const { showToast } = useToast();

  const existing = useMemo(
    () => data.people.find((p) => p.id === params.id),
    [data.people, params.id],
  );
  const villages = useMemo(() => selectVillages(data), [data]);

  const [name, setName] = useState(params.name ?? '');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [relation, setRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const [villageOpen, setVillageOpen] = useState(false);
  const [relationOpen, setRelationOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPhone(existing.phone ?? '');
    setVillage(existing.village ?? '');
    setRelation(existing.relation ?? '');
    setNotes(existing.notes ?? '');
    setPhotoUri(existing.photoUri);
  }, [existing]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    const payload = {
      name,
      phone: phone || undefined,
      village: village || undefined,
      relation: relation || undefined,
      notes: notes || undefined,
      photoUri,
    };

    try {
      if (existing) {
        await editPerson(existing.id, payload);
        showToast({ message: `${payload.name} updated` });
      } else {
        await addPerson(payload);
        showToast({ message: `${payload.name} added to your people` });
      }
      // Return to whatever sent us here (often the Add Moi form).
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
    <Screen background={colors.surface}>
      <AppHeader
        title={existing ? 'Edit Person' : 'Add Person'}
        showBack
        onBack={() => router.back()}
      />

      <KeyboardForm>
        <View style={styles.avatarBlock}>
          <Pressable
            onPress={pickPhoto}
            accessibilityRole="button"
            accessibilityLabel="Choose a photo"
            style={({ pressed }) => pressed && styles.pressed}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Avatar name={name || '?'} seed={params.id ?? name} size={88} />
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color={colors.onPrimary} />
            </View>
          </Pressable>
        </View>

        <Field
          label="Name"
          required
          value={name}
          onChangeText={setName}
          placeholder="Murugan"
          autoCapitalize="words"
          error={errors.name}
        />

        <Field
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          leftIcon="call-outline"
          error={errors.phone}
          hint="Used to spot duplicate entries for the same person."
        />

        <PickerField
          label="Village (optional)"
          value={village || undefined}
          placeholder="Choose village"
          leftIcon="location-outline"
          onPress={() => setVillageOpen(true)}
          onClear={village ? () => setVillage('') : undefined}
        />

        <PickerField
          label="Relation (optional)"
          value={relation || undefined}
          placeholder="How are they related?"
          leftIcon="people-outline"
          onPress={() => setRelationOpen(true)}
          onClear={relation ? () => setRelation('') : undefined}
        />

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth remembering"
          multiline
          numberOfLines={3}
          style={styles.notes}
        />
      </KeyboardForm>

      <DockedFooter>
        <Button
          label={existing ? 'Save Changes' : 'Add Person'}
          size="lg"
          block
          loading={saving}
          onPress={save}
        />
      </DockedFooter>

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

      <OptionPicker
        visible={relationOpen}
        onClose={() => setRelationOpen(false)}
        title="Relation"
        selected={relation}
        options={RELATIONS.map((r) => ({ value: r, label: r }))}
        onSelect={(value) => {
          setRelation(value);
          setRelationOpen(false);
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  avatarBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.8,
  },
}));
