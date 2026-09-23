import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MoiSavedSheet, type MoiSavedDetails } from '../../src/components/app/MoiSavedSheet';
import { OptionPicker } from '../../src/components/app/OptionPicker';
import { PersonPicker } from '../../src/components/app/PersonPicker';
import { DateField } from '../../src/components/app/DateField';
import {
  AppHeader, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, Segmented, T,
  useToast,
} from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { PAYMENT_TYPES, functionTypeMeta, paymentTypeMeta } from '../../src/domain/functionTypes';
import type { ID, ISODate, PaymentType } from '../../src/domain/models';
import { describeBalance, selectPersonById } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing, useColors } from '../../src/theme';
import { formatDate, toISODate } from '../../src/utils/date';
import { formatMoney } from '../../src/utils/format';

/** One-tap amounts, matching the Add Moi form. */
const QUICK_AMOUNTS = [101, 501, 1001, 2001, 5001];

/**
 * Records moi the household has given back to someone.
 *
 * The mirror of Add Moi: there the person gives to us at our function, here we
 * give to them at theirs. The form leads with what they have given us and what
 * is still outstanding, because that is how the amount actually gets decided.
 */
export default function MoiGivenScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; personId?: string; eventId?: string }>();
  const { data, addMoiGiven, editMoiGiven, removeMoiGiven } = useAppData();
  const styles = useStyles();
  const colors = useColors();
  const { showToast } = useToast();

  const existing = useMemo(
    () => data.moiGiven.find((g) => g.id === params.id),
    [data.moiGiven, params.id],
  );

  const [personId, setPersonId] = useState<ID | undefined>(params.personId);
  const [personEventId, setPersonEventId] = useState<ID | undefined>(params.eventId);
  const [occasion, setOccasion] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('cash');
  const [date, setDate] = useState<ISODate>(toISODate(new Date()));
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const [personOpen, setPersonOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<TextInput>(null);
  const [saved, setSaved] = useState<MoiSavedDetails | undefined>();

  useEffect(() => {
    if (!existing) return;
    setPersonId(existing.personId);
    setPersonEventId(existing.personEventId);
    setOccasion(existing.occasion ?? '');
    setAmount(String(existing.amount));
    setPaymentType(existing.paymentType);
    setDate(existing.date);
    setNotes(existing.notes ?? '');
    setPhotoUri(existing.photoUri);
  }, [existing]);

  const person = useMemo(
    () => (personId ? selectPersonById(data, personId) : undefined),
    [data, personId],
  );
  const balance = describeBalance(person?.balance ?? 0);
  const numericAmount = Number(amount.replace(/[^\d]/g, ''));

  /** The person's own functions, so a return can be tied to the right one. */
  const theirEvents = useMemo(
    () => data.personEvents.filter((e) => e.personId === personId),
    [data.personEvents, personId],
  );
  const chosenEvent = theirEvents.find((e) => e.id === personEventId);

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
    if (!personId) next.personId = 'Choose who you gave it to.';
    if (!numericAmount) next.amount = 'Enter the amount.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const payload = {
      personId: personId!,
      personEventId,
      occasion: occasion || chosenEvent?.title || undefined,
      amount: numericAmount,
      paymentType,
      date,
      notes: notes || undefined,
      photoUri,
    };

    try {
      if (existing) {
        await editMoiGiven(existing.id, payload);
        showToast({ message: 'Moi given updated' });
        router.back();
      } else {
        await addMoiGiven(payload);
        setSaved({
          amount: numericAmount,
          personName: person?.name ?? 'them',
          functionTitle: occasion || chosenEvent?.title,
          paymentLabel: paymentTypeMeta(paymentType).label,
          direction: 'given',
        });
      }
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

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const snapshot = existing;
          await removeMoiGiven(existing.id);
          showToast({
            message: 'Moi given deleted',
            variant: 'destructive',
            action: {
              label: 'Undo',
              onPress: () => {
                const { id, createdAt, ...rest } = snapshot;
                void addMoiGiven(rest);
              },
            },
          });
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader
        title={existing ? 'Edit Moi Given' : 'Record Moi Given'}
        showBack
        onBack={() => router.back()}
        actions={
          existing
            ? [{ icon: 'trash-outline', onPress: confirmDelete, accessibilityLabel: 'Delete record' }]
            : undefined
        }
      />

      <KeyboardForm>
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

        {person ? (
          <View
            style={[
              styles.hint,
              balance.state === 'to-return' ? styles.hintWarn : styles.hintNeutral,
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={balance.state === 'to-return' ? colors.warning : colors.info}
            />
            <T
              variant="caption"
              tone={balance.state === 'to-return' ? 'warning' : 'secondary'}
              style={styles.hintText}
            >
              {balance.state === 'to-return'
                ? `${person.name} has given ${formatMoney(person.totalReceived)}. ${formatMoney(
                    balance.amount,
                  )} still to return.`
                : balance.state === 'ahead'
                  ? `Already given ${formatMoney(balance.amount)} more than received.`
                  : 'Settled — nothing outstanding.'}
            </T>
            {balance.state === 'to-return' ? (
              <Pressable onPress={() => setAmount(String(balance.amount))} hitSlop={8}>
                <T variant="captionStrong" tone="primary">
                  Use it
                </T>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {theirEvents.length > 0 ? (
          <PickerField
            label="Their function (optional)"
            value={chosenEvent ? `${chosenEvent.title} · ${formatDate(chosenEvent.date)}` : undefined}
            placeholder="Which of their functions?"
            leftIcon="calendar-outline"
            onPress={() => setEventOpen(true)}
            onClear={personEventId ? () => setPersonEventId(undefined) : undefined}
          />
        ) : (
          <Field
            label="Occasion (optional)"
            value={occasion}
            onChangeText={setOccasion}
            placeholder="Murugan Marriage"
            autoCapitalize="words"
            leftIcon="sparkles-outline"
          />
        )}

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
              style={[styles.quickChip, numericAmount === value && styles.quickChipActive]}
            >
              <T variant="smallStrong" tone={numericAmount === value ? 'primary' : 'secondary'}>
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

        <DateField label="Date" required value={date} onChange={setDate} error={errors.date} />

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Given at the mandapam"
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
            style={styles.photoBox}
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
              Keep a picture of the moi book page or the receipt.
            </T>
          )}
        </View>
      </KeyboardForm>

      <DockedFooter>
        <Button
          label={numericAmount ? `Save ${formatMoney(numericAmount)}` : 'Save Record'}
          size="lg"
          block
          loading={saving}
          onPress={save}
        />
      </DockedFooter>

      <MoiSavedSheet
        visible={saved != null}
        details={saved}
        onDone={() => {
          setSaved(undefined);
          router.back();
        }}
        onAddAnother={() => {
          setSaved(undefined);
          setPersonId(undefined);
          setPersonEventId(undefined);
          setOccasion('');
          setAmount('');
          setNotes('');
          setPhotoUri(undefined);
          setErrors({});
          setTimeout(() => setPersonOpen(true), 250);
        }}
      />

      <PersonPicker
        visible={personOpen}
        onClose={() => setPersonOpen(false)}
        onSelect={(id) => {
          setPersonId(id);
          setPersonEventId(undefined);
          setPersonOpen(false);
          setTimeout(() => amountRef.current?.focus(), 250);
        }}
        title="Who did you give to?"
      />

      <OptionPicker
        visible={eventOpen}
        onClose={() => setEventOpen(false)}
        title="Their function"
        selected={personEventId}
        options={theirEvents.map((e) => ({
          value: e.id,
          label: e.title,
          description: formatDate(e.date),
          emoji: functionTypeMeta(e.type).emoji,
        }))}
        onSelect={(value) => {
          setPersonEventId(value);
          setEventOpen(false);
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { marginBottom: spacing.sm },
  amountInput: { fontSize: 20, fontWeight: '700' },
  segmented: { marginBottom: spacing.lg },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  hintWarn: { backgroundColor: colors.warningSoft },
  hintNeutral: { backgroundColor: colors.infoSoft },
  hintText: { flex: 1 },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  quickChip: {
    minHeight: 44,
    justifyContent: 'center',
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
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  photo: { width: '100%', height: '100%' },
  photoHint: { flex: 1 },
}));
