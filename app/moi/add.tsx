import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { PersonPicker } from '../../src/components/app/PersonPicker';
import {
  AppHeader, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, Segmented, T,
} from '../../src/components/ui';
import { PAYMENT_TYPES, functionTypeMeta } from '../../src/domain/functionTypes';
import type { ID, PaymentType } from '../../src/domain/models';
import { selectFunctions } from '../../src/domain/selectors';
import { ValidationError } from '../../src/data';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, radius, spacing } from '../../src/theme';
import { formatDate } from '../../src/utils/date';
import { formatMoney } from '../../src/utils/format';

/** One-tap amounts covering the great majority of real entries. */
const QUICK_AMOUNTS = [101, 501, 1001, 2001, 5001];

export default function AddMoiScreen() {
  const router = useRouter();
  const { data, addMoiEntry, repositories } = useAppData();
  const params = useLocalSearchParams<{ functionId?: string; personId?: string }>();

  const functions = useMemo(() => selectFunctions(data), [data]);
  /** Default to the next upcoming function, else the most recent one. */
  const defaultFunctionId = useMemo(() => {
    if (params.functionId) return params.functionId;
    const upcoming = [...functions]
      .filter((f) => f.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date));
    return upcoming[0]?.id ?? functions[0]?.id;
  }, [functions, params.functionId]);

  const [functionId, setFunctionId] = useState<ID | undefined>(defaultFunctionId);
  const [personId, setPersonId] = useState<ID | undefined>(params.personId);

  // `useState` keeps its first value, so a default that only becomes known once
  // the dataset finishes loading (a cold start, or a deep link into this form)
  // would never be applied. Adopt it once, without overriding a real choice.
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (defaultApplied.current || functionId || !defaultFunctionId) return;
    defaultApplied.current = true;
    setFunctionId(defaultFunctionId);
  }, [defaultFunctionId, functionId]);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const [personOpen, setPersonOpen] = useState(false);
  const [functionOpen, setFunctionOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<TextInput>(null);

  const person = data.people.find((p) => p.id === personId);
  const fn = functions.find((f) => f.id === functionId);
  const numericAmount = Number(amount.replace(/[^\d]/g, ''));

  /** Last thing this person gave — the number the host wants to see. */
  const previous = useMemo(() => {
    if (!personId) return undefined;
    const entries = data.moiEntries
      .filter((e) => e.personId === personId)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
    return entries[0]?.amount;
  }, [data.moiEntries, personId]);

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

  const save = async () => {
    const next: Record<string, string> = {};
    if (!functionId) next.functionId = 'Choose which function this is for.';
    if (!personId) next.personId = 'Choose who gave the moi.';
    if (!numericAmount) next.amount = 'Enter the amount.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // A repeat entry for the same person at the same function is nearly always
    // a mistake, so confirm rather than silently double-count.
    const duplicate = await repositories.moi.findExisting(functionId!, personId!);
    if (duplicate) {
      const proceed = await confirm(
        'Already recorded',
        `${person?.name} is already down for ${formatMoney(duplicate.amount)} at this function. Add another entry?`,
      );
      if (!proceed) return;
    }

    setSaving(true);
    try {
      await addMoiEntry({
        functionId: functionId!,
        personId: personId!,
        amount: numericAmount,
        paymentType,
        notes: notes.trim() || undefined,
        photoUri,
      });
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.field ?? 'amount']: error.message });
      } else {
        Alert.alert('Could not save', 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader title="Add Moi" showBack onBack={() => router.back()} />

      <KeyboardForm>
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
          placeholder="Choose who gave"
          leftIcon="person-outline"
          onPress={() => setPersonOpen(true)}
          onClear={person ? () => setPersonId(undefined) : undefined}
          error={errors.personId}
        />

        {previous ? (
          <View style={styles.previousHint}>
            <Ionicons name="information-circle-outline" size={15} color={colors.info} />
            <T variant="caption" tone="secondary" style={styles.previousText}>
              Last time {person?.name} gave {formatMoney(previous)}
            </T>
            <Pressable onPress={() => setAmount(String(previous))} hitSlop={8}>
              <T variant="captionStrong" tone="primary">
                Use it
              </T>
            </Pressable>
          </View>
        ) : null}

        <Field
          ref={amountRef}
          label="Amount"
          required
          prefix="₹"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          returnKeyType="done"
          error={errors.amount}
          style={styles.amountInput}
        />

        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((value) => (
            <Pressable
              key={value}
              onPress={() => setAmount(String(value))}
              accessibilityRole="button"
              accessibilityLabel={`Set amount to ${value} rupees`}
              style={({ pressed }) => [
                styles.quickChip,
                numericAmount === value && styles.quickChipActive,
                pressed && styles.pressed,
              ]}
            >
              <T
                variant="smallStrong"
                tone={numericAmount === value ? 'primary' : 'secondary'}
              >
                ₹{value}
              </T>
            </Pressable>
          ))}
        </View>

        <T variant="smallStrong" tone="secondary" style={styles.label}>
          Payment type
        </T>
        <Segmented<PaymentType>
          options={PAYMENT_TYPES.map((p) => ({ value: p.value, label: p.label }))}
          value={paymentType}
          onChange={setPaymentType}
          style={styles.segmented}
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
              Attach a picture of the moi book page or the gift.
            </T>
          )}
        </View>
      </KeyboardForm>

      <DockedFooter>
        <Button
          label={numericAmount ? `Save ${formatMoney(numericAmount)}` : 'Save Entry'}
          size="lg"
          block
          loading={saving}
          onPress={save}
        />
      </DockedFooter>

      <PersonPicker
        visible={personOpen}
        onClose={() => setPersonOpen(false)}
        onSelect={(id) => {
          setPersonId(id);
          setPersonOpen(false);
          // Amount is the next thing they need to type; save them a tap.
          setTimeout(() => amountRef.current?.focus(), 250);
        }}
        onCreateNew={(prefillName) => {
          setPersonOpen(false);
          router.push({ pathname: '/person/new', params: { name: prefillName, returnTo: 'moi' } });
        }}
      />

      <OptionPicker
        visible={functionOpen}
        onClose={() => setFunctionOpen(false)}
        title="Choose function"
        selected={functionId}
        options={functions.map((f) => ({
          value: f.id,
          label: f.title,
          description: `${formatDate(f.date)}${f.village ? ` · ${f.village}` : ''}`,
          emoji: functionTypeMeta(f.type).emoji,
        }))}
        onSelect={(id) => {
          setFunctionId(id);
          setFunctionOpen(false);
        }}
      />
    </Screen>
  );
}

/** Promise-based wrapper around the native two-button alert. */
function confirm(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Add anyway', onPress: () => resolve(true) },
    ]);
  });
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.sm,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '700',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  quickChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySofter,
  },
  segmented: {
    marginBottom: spacing.lg,
  },
  notes: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  previousHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  previousText: {
    flex: 1,
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
  pressed: {
    opacity: 0.75,
  },
});
