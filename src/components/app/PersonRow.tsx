import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { paymentTypeMeta } from '../../domain/functionTypes';
import type { MoiEntryView, PersonWithStats } from '../../domain/selectors';
import { colors, spacing } from '../../theme';
import { formatPhone } from '../../utils/format';
import { formatTime } from '../../utils/date';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Money, T } from '../ui/Text';

/** A person in the People tab: avatar, name, phone, village, lifetime total. */
export function PersonRow({
  person,
  onPress,
}: {
  person: PersonWithStats;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.card} padded={false}>
      <View style={styles.row}>
        <Avatar name={person.name} uri={person.photoUri} seed={person.id} size={46} />

        <View style={styles.body}>
          <T variant="bodyStrong" numberOfLines={1}>
            {person.name}
          </T>
          {person.phone ? (
            <View style={styles.metaRow}>
              <Ionicons name="call-outline" size={11} color={colors.textMuted} />
              <T variant="caption" tone="muted" numberOfLines={1}>
                {formatPhone(person.phone)}
              </T>
            </View>
          ) : null}
          {person.village ? (
            <T variant="caption" tone="muted" numberOfLines={1} style={styles.village}>
              {person.village}
            </T>
          ) : null}
        </View>

        <View style={styles.trailing}>
          <Money value={person.totalGiven} flow="out" variant="bodyStrong" />
          <T variant="caption" tone="muted" style={styles.trailingSub}>
            {person.functionCount} {person.functionCount === 1 ? 'Function' : 'Functions'}
          </T>
        </View>
      </View>
    </Card>
  );
}

/** A single moi entry in a function's list: who gave, how much, how and when. */
export function MoiEntryRow({
  entry,
  onPress,
}: {
  entry: MoiEntryView;
  onPress?: () => void;
}) {
  const payment = paymentTypeMeta(entry.paymentType);
  const name = entry.person?.name ?? 'Unknown';

  return (
    <Card onPress={onPress} style={styles.card} padded={false}>
      <View style={styles.row}>
        <Avatar name={name} uri={entry.person?.photoUri} seed={entry.personId} size={42} />

        <View style={styles.body}>
          <T variant="bodyStrong" numberOfLines={1}>
            {name}
          </T>
          <View style={styles.metaRow}>
            <Ionicons name={payment.icon} size={11} color={colors.textMuted} />
            <T variant="caption" tone="muted">
              {payment.label}
            </T>
            {entry.person?.village ? (
              <T variant="caption" tone="muted" numberOfLines={1}>
                {` · ${entry.person.village}`}
              </T>
            ) : null}
          </View>
        </View>

        <View style={styles.trailing}>
          <Money value={entry.amount} flow="out" variant="bodyStrong" />
          <T variant="caption" tone="muted" style={styles.trailingSub}>
            {formatTime(entry.recordedAt)}
          </T>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  body: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  village: {
    marginTop: 1,
  },
  trailing: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  trailingSub: {
    marginTop: 2,
  },
});
