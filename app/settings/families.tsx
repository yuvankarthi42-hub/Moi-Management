import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  AppHeader, Button, Card, EmptyState, Field, ListRow, RowDivider, Screen, ScreenScroll, Sheet, T,
} from '../../src/components/ui';
import { ValidationError } from '../../src/data';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing } from '../../src/theme';
import { formatMoney } from '../../src/utils/format';

/** Manage the family groupings used by the family report. */
export default function FamiliesScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data, addFamily, removeFamily } = useAppData();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  /** Member count and lifetime total for each family, computed in one pass. */
  const stats = useMemo(() => {
    const byPerson = new Map<string, number>();
    for (const entry of data.moiEntries) {
      byPerson.set(entry.personId, (byPerson.get(entry.personId) ?? 0) + entry.amount);
    }
    const map = new Map<string, { members: number; total: number }>();
    for (const person of data.people) {
      if (!person.familyId) continue;
      const bucket = map.get(person.familyId) ?? { members: 0, total: 0 };
      bucket.members += 1;
      bucket.total += byPerson.get(person.id) ?? 0;
      map.set(person.familyId, bucket);
    }
    return map;
  }, [data.people, data.moiEntries]);

  const create = async () => {
    setError(undefined);
    setSaving(true);
    try {
      await addFamily({ name, village: village || undefined });
      setName('');
      setVillage('');
      setOpen(false);
    } catch (e) {
      setError(e instanceof ValidationError ? e.message : 'Could not add the family.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string, label: string) => {
    Alert.alert(
      'Delete family?',
      `“${label}” will be removed. Its members stay in your contact book, just without a family.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeFamily(id) },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader
        title="Families"
        subtitle={`${data.families.length} ${data.families.length === 1 ? 'family' : 'families'}`}
        showBack
        onBack={() => router.back()}
        actions={[
          { icon: 'add', onPress: () => setOpen(true), accessibilityLabel: 'Add family' },
        ]}
      />

      <ScreenScroll>
        <View style={styles.body}>
          {data.families.length > 0 ? (
            <Card padded={false}>
              {data.families.map((family, index) => {
                const stat = stats.get(family.id);
                return (
                  <View key={family.id}>
                    {index > 0 ? <RowDivider /> : null}
                    <ListRow
                      icon="home-outline"
                      title={family.name}
                      subtitle={[
                        family.village,
                        `${stat?.members ?? 0} ${stat?.members === 1 ? 'member' : 'members'}`,
                        stat?.total ? `${formatMoney(stat.total)} received` : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      showChevron={false}
                      onPress={() => confirmDelete(family.id, family.name)}
                    />
                  </View>
                );
              })}
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="home-outline"
                title="No families yet"
                message="Group related people so you can see a family-wise collection summary."
                actionLabel="Add Family"
                onAction={() => setOpen(true)}
              />
            </Card>
          )}

          <T variant="caption" tone="muted" center style={styles.hint}>
            Tap a family to remove it. Assign people to a family from their profile.
          </T>
        </View>
      </ScreenScroll>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Add family"
        footer={<Button label="Add Family" block loading={saving} onPress={create} />}
      >
        <View style={styles.form}>
          <Field
            label="Family name"
            required
            value={name}
            onChangeText={setName}
            placeholder="Murugan Family"
            autoCapitalize="words"
            error={error}
          />
          <Field
            label="Village (optional)"
            value={village}
            onChangeText={setVillage}
            placeholder="Tenkasi"
            autoCapitalize="words"
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  hint: {
    marginTop: spacing.lg,
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
}));
