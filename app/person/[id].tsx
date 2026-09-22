import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  AppHeader, Avatar, Badge, Button, Card, EmptyState, Money, Screen, ScreenScroll,
  SectionHeader, StatRow, T,
} from '../../src/components/ui';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import {
  buildReturnMoiReport, selectMoiEntriesForPerson, selectPersonById,
} from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, spacing, useColors } from '../../src/theme';
import { countdownLabel, formatDate } from '../../src/utils/date';
import { formatCount, formatMoneyCompact, formatPhone } from '../../src/utils/format';

export default function PersonProfileScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, removePerson } = useAppData();

  const person = useMemo(() => (id ? selectPersonById(data, id) : undefined), [data, id]);
  const history = useMemo(() => (id ? selectMoiEntriesForPerson(data, id) : []), [data, id]);
  const upcoming = useMemo(
    () => buildReturnMoiReport(data, { withinDays: 365 }).filter((r) => r.person.id === id),
    [data, id],
  );

  if (!person) {
    return (
      <Screen>
        <AppHeader title="Person" showBack onBack={() => router.back()} />
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <EmptyState
            icon="alert-circle-outline"
            title="Person not found"
            message="They may have been deleted."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        )}
      </Screen>
    );
  }

  /** Opens the dialler / SMS app. Silently ignored if no app can handle it. */
  const openLink = async (scheme: 'tel' | 'sms') => {
    if (!person.phone) return;
    const url = `${scheme}:${person.phone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('Not available', 'This device cannot open that app.');
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete person?',
      `${person.name} and their ${history.length} moi ${
        history.length === 1 ? 'entry' : 'entries'
      } will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removePerson(person.id);
            router.replace('/(tabs)/people');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader
        title="Person Profile"
        showBack
        onBack={() => router.back()}
        bleed={56}
        actions={[
          {
            icon: 'create-outline',
            onPress: () => router.push(`/person/new?id=${person.id}`),
            accessibilityLabel: 'Edit person',
          },
          {
            icon: 'trash-outline',
            onPress: confirmDelete,
            accessibilityLabel: 'Delete person',
          },
        ]}
      >
        <View style={styles.identity}>
          <Avatar
            name={person.name}
            uri={person.photoUri}
            seed={person.id}
            size={76}
            style={styles.avatar}
          />
          <View style={styles.identityText}>
            <T variant="h2" tone="onPrimary" numberOfLines={1}>
              {person.name}
            </T>
            <T variant="small" color={colors.onPrimaryMuted} numberOfLines={1}>
              {[person.village, person.relation].filter(Boolean).join(' · ') || 'No details yet'}
            </T>
          </View>
        </View>
      </AppHeader>

      <ScreenScroll>
        <Card style={styles.actionCard} elevation={2} padded={false}>
          <View style={styles.actionRow}>
            <ActionButton
              icon="call"
              label="Call"
              tint={colors.success}
              disabled={!person.phone}
              onPress={() => openLink('tel')}
            />
            <View style={styles.actionDivider} />
            <ActionButton
              icon="chatbubble-ellipses"
              label="Message"
              tint={colors.info}
              disabled={!person.phone}
              onPress={() => openLink('sms')}
            />
            <View style={styles.actionDivider} />
            <ActionButton
              icon="create"
              label="Edit"
              tint={colors.primary}
              onPress={() => router.push(`/person/new?id=${person.id}`)}
            />
          </View>
        </Card>

        <Card style={styles.statsCard}>
          <StatRow
            compactLabels
            items={[
              { label: 'Total Given', value: formatMoneyCompact(person.totalGiven), tone: 'danger' },
              { label: 'Functions', value: formatCount(person.functionCount) },
              {
                label: 'Average',
                value: formatMoneyCompact(
                  history.length ? Math.round(person.totalGiven / history.length) : 0,
                ),
              },
            ]}
          />
        </Card>

        <Card style={styles.detailCard}>
          {person.phone ? (
            <DetailRow icon="call-outline" label="Phone" value={formatPhone(person.phone)} />
          ) : null}
          {person.village ? (
            <DetailRow icon="location-outline" label="Village" value={person.village} />
          ) : null}
          {person.familyName ? (
            <DetailRow icon="home-outline" label="Family" value={person.familyName} />
          ) : null}
          {person.relation ? (
            <DetailRow icon="people-outline" label="Relation" value={person.relation} />
          ) : null}
          {person.notes ? (
            <DetailRow icon="document-text-outline" label="Notes" value={person.notes} />
          ) : null}
          {!person.phone && !person.village && !person.familyName && !person.relation ? (
            <T variant="small" tone="muted" center>
              No contact details saved yet.
            </T>
          ) : null}
        </Card>

        {upcoming.length > 0 ? (
          <>
            <SectionHeader title="Their Upcoming Functions" />
            <View style={styles.sideMargin}>
              {upcoming.map((row) => (
                <Card key={row.event.id} style={styles.upcomingCard}>
                  <View style={styles.upcomingRow}>
                    <T style={styles.upcomingEmoji} allowFontScaling={false}>
                      {functionTypeMeta(row.event.type).emoji}
                    </T>
                    <View style={styles.upcomingBody}>
                      <T variant="bodyStrong" numberOfLines={1}>
                        {row.event.title}
                      </T>
                      <T variant="caption" tone="muted">
                        {formatDate(row.event.date)}
                      </T>
                    </View>
                    <Badge
                      label={countdownLabel(row.event.date)}
                      tone={row.daysAway <= 7 ? 'danger' : 'warning'}
                    />
                  </View>
                  <View style={styles.suggestRow}>
                    <T variant="small" tone="secondary">
                      Suggested return
                    </T>
                    <Money value={row.suggested} flow="out" variant="h3" />
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        <SectionHeader title="Moi History" />
        <View style={styles.sideMargin}>
          {history.length > 0 ? (
            <Card padded={false}>
              {history.map((entry, index) => (
                <Pressable
                  key={entry.id}
                  onPress={() => router.push(`/function/${entry.functionId}`)}
                  accessibilityRole="button"
                  android_ripple={{ color: colors.primarySoft }}
                  style={({ pressed }) => [
                    styles.historyRow,
                    index > 0 && styles.historyDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.historyBody}>
                    <T variant="body" numberOfLines={1}>
                      {entry.functionTitle ?? 'Function'}
                    </T>
                    <T variant="caption" tone="muted">
                      {formatDate(
                        data.functions.find((f) => f.id === entry.functionId)?.date ??
                          entry.recordedAt.slice(0, 10),
                      )}
                    </T>
                  </View>
                  <Money value={entry.amount} flow="out" />
                </Pressable>
              ))}
            </Card>
          ) : (
            <Card>
              <EmptyState
                icon="receipt-outline"
                title="No moi recorded"
                message={`${person.name} has not been recorded at any of your functions yet.`}
                actionLabel="Add Moi"
                onAction={() => router.push(`/moi/add?personId=${person.id}`)}
              />
            </Card>
          )}
        </View>

        {history.length > 0 ? (
          <View style={styles.sideMargin}>
            <Button
              label="Add Moi for this person"
              icon="add"
              variant="secondary"
              block
              style={styles.addButton}
              onPress={() => router.push(`/moi/add?personId=${person.id}`)}
            />
          </View>
        ) : null}
      </ScreenScroll>
    </Screen>
  );
}

function ActionButton({
  icon,
  label,
  tint,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={19} color={tint} />
      <T variant="captionStrong" tone="secondary">
        {label}
      </T>
    </Pressable>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={17} color={colors.textMuted} />
      <T variant="small" tone="muted" style={styles.detailLabel}>
        {label}
      </T>
      <T variant="bodyStrong" style={styles.detailValue} numberOfLines={3}>
        {value}
      </T>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  loading: {
    marginTop: spacing.xxxl,
  },
  identity: {
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  identityText: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  actionCard: {
    marginHorizontal: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.md,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  detailCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  detailLabel: {
    width: 68,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  sideMargin: {
    marginHorizontal: spacing.lg,
  },
  upcomingCard: {
    marginBottom: spacing.md,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upcomingEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  upcomingBody: {
    flex: 1,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  historyDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  historyBody: {
    flex: 1,
  },
  addButton: {
    marginTop: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
}));
