import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { PersonPicker } from '../../src/components/app/PersonPicker';
import {
  AppHeader, Button, DockedFooter, Field, KeyboardForm, PickerField, Screen, Segmented, T,
} from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { RSVP_STATUSES } from '../../src/domain/categories';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import type { ID, RsvpStatus } from '../../src/domain/models';
import { selectFunctions, selectVillages } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, spacing } from '../../src/theme';
import { formatDate } from '../../src/utils/date';

const GROUPS = [
  "Bride's side", "Groom's side", 'Relatives', 'Neighbours', 'Office',
  'School friends', 'Village elders', 'Other',
];

/** Adds or edits one invitation on a function's guest list (spec §11). */
export default function GuestFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; functionId?: string }>();
  const { data, addGuest, editGuest, removeGuest } = useAppData();

  const functions = useMemo(() => selectFunctions(data), [data]);
  const villages = useMemo(() => selectVillages(data), [data]);
  const existing = useMemo(
    () => data.guests.find((g) => g.id === params.id),
    [data.guests, params.id],
  );

  const defaultFunctionId =
    params.functionId ??
    [...functions].filter((f) => f.status === 'upcoming').sort((a, b) =>
      a.date.localeCompare(b.date),
    )[0]?.id ??
    functions[0]?.id;

  const [functionId, setFunctionId] = useState<ID | undefined>(defaultFunctionId);
  const [personId, setPersonId] = useState<ID | undefined>();
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [groupName, setGroupName] = useState('');
  const [village, setVillage] = useState('');
  const [guestCount, setGuestCount] = useState('1');
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>('pending');
  const [notes, setNotes] = useState('');

  const [functionOpen, setFunctionOpen] = useState(false);
  const [personOpen, setPersonOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [villageOpen, setVillageOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const defaultApplied = useRef(false);
  useEffect(() => {
    if (defaultApplied.current || functionId || !defaultFunctionId) return;
    defaultApplied.current = true;
    setFunctionId(defaultFunctionId);
  }, [defaultFunctionId, functionId]);

  useEffect(() => {
    if (!existing) return;
    setFunctionId(existing.functionId);
    setPersonId(existing.personId);
    setGuestName(existing.guestName);
    setPhone(existing.phone ?? '');
    setRelationship(existing.relationship ?? '');
    setGroupName(existing.groupName ?? '');
    setVillage(existing.village ?? '');
    setGuestCount(String(existing.guestCount));
    setRsvpStatus(existing.rsvpStatus);
    setNotes(existing.notes ?? '');
  }, [existing]);

  const fn = functions.find((f) => f.id === functionId);

  /** Choosing a known person fills the rest of the row from the directory. */
  const applyPerson = (id: ID) => {
    const person = data.people.find((p) => p.id === id);
    setPersonId(id);
    if (person) {
      setGuestName(person.name);
      if (person.phone) setPhone(person.phone);
      if (person.village) setVillage(person.village);
      if (person.relation) setRelationship(person.relation);
    }
    setPersonOpen(false);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    const payload = {
      functionId: functionId!,
      personId,
      guestName,
      phone: phone || undefined,
      relationship: relationship || undefined,
      groupName: groupName || undefined,
      village: village || undefined,
      guestCount: Number(guestCount) || 1,
      rsvpStatus,
      checkedIn: existing?.checkedIn ?? false,
      notes: notes || undefined,
    };

    try {
      if (!functionId) throw new ValidationError('Choose a function.', 'functionId');
      if (existing) await editGuest(existing.id, payload);
      else await addGuest(payload);
      router.back();
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.field ?? 'guestName']: error.message });
      } else {
        Alert.alert('Could not save', 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Remove guest?', `${existing.guestName} will be taken off this list.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeGuest(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen background={colors.surface}>
      <AppHeader
        title={existing ? 'Edit Guest' : 'Add Guest'}
        showBack
        onBack={() => router.back()}
        actions={
          existing
            ? [{ icon: 'trash-outline', onPress: confirmDelete, accessibilityLabel: 'Remove guest' }]
            : undefined
        }
      />

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
          label="From your people (optional)"
          value={data.people.find((p) => p.id === personId)?.name}
          placeholder="Pick someone you already know"
          leftIcon="person-outline"
          onPress={() => setPersonOpen(true)}
          onClear={personId ? () => setPersonId(undefined) : undefined}
        />

        <Field
          label="Guest name"
          required
          value={guestName}
          onChangeText={setGuestName}
          placeholder="Murugan"
          autoCapitalize="words"
          error={errors.guestName}
        />

        <Field
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          leftIcon="call-outline"
        />

        <View style={styles.pairRow}>
          <Field
            label="Number of people"
            required
            value={guestCount}
            onChangeText={(text) => setGuestCount(text.replace(/[^\d]/g, ''))}
            keyboardType="number-pad"
            placeholder="1"
            containerStyle={styles.pairItem}
            error={errors.guestCount}
            hint="Including this guest"
          />
          <Field
            label="Relationship"
            value={relationship}
            onChangeText={setRelationship}
            placeholder="Mama"
            autoCapitalize="words"
            containerStyle={styles.pairItem}
          />
        </View>

        <PickerField
          label="Group (optional)"
          value={groupName || undefined}
          placeholder="Which side are they from?"
          leftIcon="people-outline"
          onPress={() => setGroupOpen(true)}
          onClear={groupName ? () => setGroupName('') : undefined}
        />

        <PickerField
          label="Village (optional)"
          value={village || undefined}
          placeholder="Choose village"
          leftIcon="location-outline"
          onPress={() => setVillageOpen(true)}
          onClear={village ? () => setVillage('') : undefined}
        />

        <T variant="smallStrong" tone="secondary" style={styles.label}>
          RSVP
        </T>
        <Segmented<RsvpStatus>
          options={RSVP_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          value={rsvpStatus}
          onChange={setRsvpStatus}
          style={styles.segmented}
        />

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Coming on the morning bus"
          multiline
          numberOfLines={3}
          style={styles.notes}
        />
      </KeyboardForm>

      <DockedFooter>
        <Button
          label={existing ? 'Save Changes' : 'Add Guest'}
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
          description: `${formatDate(f.date)}${f.village ? ` · ${f.village}` : ''}`,
          emoji: functionTypeMeta(f.type).emoji,
        }))}
        onSelect={(id) => {
          setFunctionId(id);
          setFunctionOpen(false);
        }}
      />

      <PersonPicker
        visible={personOpen}
        onClose={() => setPersonOpen(false)}
        onSelect={applyPerson}
        title="Choose person"
      />

      <OptionPicker
        visible={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="Group"
        selected={groupName}
        options={GROUPS.map((g) => ({ value: g, label: g }))}
        onSelect={(value) => {
          setGroupName(value);
          setGroupOpen(false);
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

const styles = StyleSheet.create({
  label: { marginBottom: spacing.sm },
  segmented: { marginBottom: spacing.lg },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  pairRow: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
});
