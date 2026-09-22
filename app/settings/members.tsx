import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import {
  AppHeader, Avatar, Badge, Button, Card, EmptyState, Field, ListRow, RowDivider, Screen,
  ScreenScroll, Sheet, T,
} from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { FAMILY_ROLES, roleMeta } from '../../src/domain/categories';
import type { FamilyMember, FamilyRole } from '../../src/domain/models';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, spacing } from '../../src/theme';
import { formatPhone } from '../../src/utils/format';

const ROLE_TONE: Record<FamilyRole, 'primary' | 'success' | 'info' | 'neutral'> = {
  owner: 'primary',
  admin: 'success',
  editor: 'info',
  viewer: 'neutral',
};

/**
 * Who can work on the household's records, and what each of them may do
 * (spec §16). Permissions are enforced in `FamilyMemberRepository`, not here.
 */
export default function FamilyMembersScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data, addFamilyMember, setMemberRole, removeFamilyMember } = useAppData();

  const [addOpen, setAddOpen] = useState(false);
  const [roleFor, setRoleFor] = useState<FamilyMember | undefined>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<FamilyRole>('editor');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const create = async () => {
    setError(undefined);
    setSaving(true);
    try {
      await addFamilyMember({ name, phone: phone || undefined, role });
      setName('');
      setPhone('');
      setRole('editor');
      setAddOpen(false);
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Could not add that member.');
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member: FamilyMember, next: FamilyRole) => {
    setRoleFor(undefined);
    try {
      await setMemberRole(member.id, next);
    } catch (e) {
      Alert.alert('Could not change role', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  const confirmRemove = (member: FamilyMember) => {
    Alert.alert(
      'Remove member?',
      `${member.name} will lose access to your family's records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFamilyMember(member.id);
            } catch (e) {
              Alert.alert(
                'Could not remove',
                e instanceof Error ? e.message : 'Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader
        title="Family Members"
        subtitle={`${data.familyMembers.length} ${
          data.familyMembers.length === 1 ? 'member' : 'members'
        }`}
        showBack
        onBack={() => router.back()}
        actions={[{ icon: 'add', onPress: () => setAddOpen(true), accessibilityLabel: 'Add member' }]}
      />

      <ScreenScroll>
        <View style={styles.body}>
          {data.familyMembers.length > 0 ? (
            <Card padded={false}>
              {data.familyMembers.map((member, index) => {
                const meta = roleMeta(member.role);
                return (
                  <View key={member.id}>
                    {index > 0 ? <RowDivider inset={false} /> : null}
                    <View style={styles.row}>
                      <Avatar name={member.name} seed={member.id} size={42} />
                      <View style={styles.rowBody}>
                        <View style={styles.nameRow}>
                          <T variant="bodyStrong" numberOfLines={1} style={styles.name}>
                            {member.name}
                          </T>
                          {member.isSelf ? <Badge label="You" tone="neutral" /> : null}
                        </View>
                        <T variant="caption" tone="muted" numberOfLines={1}>
                          {member.phone ? formatPhone(member.phone) : meta.description}
                        </T>
                      </View>
                      <View style={styles.rowActions}>
                        <Badge label={meta.label} tone={ROLE_TONE[member.role]} />
                      </View>
                    </View>

                    <View style={styles.rowButtons}>
                      <Button
                        label="Change role"
                        variant="ghost"
                        size="sm"
                        onPress={() => setRoleFor(member)}
                      />
                      {!member.isSelf ? (
                        <Button
                          label="Remove"
                          variant="ghost"
                          size="sm"
                          onPress={() => confirmRemove(member)}
                        />
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="people-outline"
                title="No members yet"
                message="Add the relatives who help you run functions, and choose what each of them can do."
                actionLabel="Add Member"
                onAction={() => setAddOpen(true)}
              />
            </Card>
          )}

          <Card padded={false} style={styles.legend}>
            {FAMILY_ROLES.map((r, index) => (
              <View key={r.value}>
                {index > 0 ? <RowDivider inset={false} /> : null}
                <ListRow
                  title={r.label}
                  subtitle={r.description}
                  showChevron={false}
                />
              </View>
            ))}
          </Card>
        </View>
      </ScreenScroll>

      <Sheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add family member"
        footer={<Button label="Add Member" block loading={saving} onPress={create} />}
      >
        <View style={styles.form}>
          <Field
            label="Name"
            required
            value={name}
            onChangeText={setName}
            placeholder="Meena"
            autoCapitalize="words"
            error={error}
          />
          <Field
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="98765 43210"
            keyboardType="phone-pad"
            leftIcon="call-outline"
          />
          <T variant="smallStrong" tone="secondary" style={styles.roleLabel}>
            Role
          </T>
          {FAMILY_ROLES.filter((r) => r.value !== 'owner').map((r) => (
            <ListRow
              key={r.value}
              title={r.label}
              subtitle={r.description}
              showChevron={false}
              onPress={() => setRole(r.value)}
              right={
                role === r.value ? (
                  <T variant="smallStrong" tone="primary">
                    ✓
                  </T>
                ) : undefined
              }
            />
          ))}
        </View>
      </Sheet>

      <OptionPicker
        visible={roleFor != null}
        onClose={() => setRoleFor(undefined)}
        title={roleFor ? `Role for ${roleFor.name}` : 'Role'}
        selected={roleFor?.role}
        options={FAMILY_ROLES.map((r) => ({
          value: r.value,
          label: r.label,
          description: r.description,
        }))}
        onSelect={(next) => roleFor && changeRole(roleFor, next)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  rowBody: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  rowActions: {
    alignItems: 'flex-end',
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  legend: {
    marginTop: spacing.xl,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  roleLabel: {
    marginBottom: spacing.sm,
  },
}));
