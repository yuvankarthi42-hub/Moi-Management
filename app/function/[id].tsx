import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpenseRow } from '../../src/components/app/ExpenseRow';
import { GuestRow } from '../../src/components/app/GuestRow';
import { MoiEntryRow, PersonRow } from '../../src/components/app/PersonRow';
import {
  Badge, Button, Card, EmptyState, Money, Screen, ScreenScroll, StatRow, StatusBarScrim, T,
} from '../../src/components/ui';
import { rsvpMeta } from '../../src/domain/categories';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import type { RsvpStatus } from '../../src/domain/models';
import {
  selectExpensesForFunction, selectFunctionById, selectGuestStats,
  selectGuestsForFunction, selectMoiEntriesForFunction, selectPeople,
  splitByPaymentType, type FunctionWithStats,
} from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing, useColors } from '../../src/theme';
import { countdownLabel, formatDate, formatDateLong } from '../../src/utils/date';
import { formatCount, formatMoney, formatMoneyCompact } from '../../src/utils/format';

type Tab = 'overview' | 'moi' | 'guests' | 'expenses' | 'people' | 'photos';

const TABS: Array<{ key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'overview', label: 'Overview', icon: 'information-circle-outline' },
  { key: 'moi', label: 'Moi', icon: 'list-outline' },
  { key: 'guests', label: 'Guests', icon: 'people-circle-outline' },
  { key: 'expenses', label: 'Expenses', icon: 'receipt-outline' },
  { key: 'people', label: 'People', icon: 'people-outline' },
  { key: 'photos', label: 'Photos', icon: 'images-outline' },
];

/** RSVP filters for the guest tab. */
const GUEST_FILTERS: Array<{ value: RsvpStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'pending', label: 'Pending' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'declined', label: 'Declined' },
];

export default function FunctionDetailScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    data, loading, removeFunction, addFunctionPhoto, removeFunctionPhoto, setGuestCheckedIn,
  } = useAppData();
  const [tab, setTab] = useState<Tab>('overview');
  const [guestFilter, setGuestFilter] = useState<RsvpStatus | 'all'>('all');

  const fn = useMemo(() => (id ? selectFunctionById(data, id) : undefined), [data, id]);
  const entries = useMemo(() => (id ? selectMoiEntriesForFunction(data, id) : []), [data, id]);
  const expenses = useMemo(() => (id ? selectExpensesForFunction(data, id) : []), [data, id]);
  const guests = useMemo(() => (id ? selectGuestsForFunction(data, id) : []), [data, id]);
  const guestStats = useMemo(() => selectGuestStats(guests), [guests]);
  const expenseSplit = useMemo(() => splitByPaymentType(expenses), [expenses]);
  const visibleGuests = useMemo(
    () => (guestFilter === 'all' ? guests : guests.filter((g) => g.rsvpStatus === guestFilter)),
    [guests, guestFilter],
  );

  const contributors = useMemo(() => {
    const ids = new Set(entries.map((e) => e.personId));
    return selectPeople(data).filter((p) => ids.has(p.id));
  }, [data, entries]);

  if (!fn) {
    return (
      <Screen>
        <View style={[styles.missing, { paddingTop: insets.top + spacing.xxxl }]}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <EmptyState
              icon="alert-circle-outline"
              title="Function not found"
              message="It may have been deleted."
              actionLabel="Go back"
              onAction={() => router.back()}
            />
          )}
        </View>
      </Screen>
    );
  }

  const meta = functionTypeMeta(fn.type);

  const share = async () => {
    const lines = [
      fn.title,
      `${formatDateLong(fn.date)}${fn.time ? ` at ${fn.time}` : ''}`,
      fn.venue || undefined,
      '',
      `Moi collected: ${formatMoney(fn.collected)} from ${fn.entryCount} entries`,
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n'), title: fn.title });
    } catch {
      // Dismissing the share sheet is not an error worth surfacing.
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete function?',
      `“${fn.title}” and its ${fn.entryCount} moi ${
        fn.entryCount === 1 ? 'entry' : 'entries'
      } will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeFunction(fn.id);
            router.replace('/(tabs)/functions');
          },
        },
      ],
    );
  };

  const addPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled) return;
    for (const asset of result.assets) await addFunctionPhoto(fn.id, asset.uri);
  };

  return (
    <Screen>
      {/* The hero scrolls away, so keep the status-bar strip dark behind it. */}
      <StatusBarScrim color="rgba(12, 6, 32, 0.55)" />
      <ScreenScroll extraBottomSpace={72}>
        {/* Hero: cover image when set, otherwise the brand gradient. */}
        <View style={styles.hero}>
          {fn.coverImage ? (
            <Image source={{ uri: fn.coverImage }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <LinearGradient colors={colors.headerGradient} style={styles.heroImage}>
              <T style={styles.heroEmoji} allowFontScaling={false}>
                {meta.emoji}
              </T>
            </LinearGradient>
          )}

          <View style={[styles.heroBar, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/(tabs)/functions')
              }
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.heroButton}
            >
              <Ionicons name="arrow-back" size={21} color={colors.onPrimary} />
            </Pressable>
            <View style={styles.heroActions}>
              <Pressable
                onPress={() => router.push(`/function/new?id=${fn.id}`)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Edit function"
                style={styles.heroButton}
              >
                <Ionicons name="create-outline" size={20} color={colors.onPrimary} />
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Delete function"
                style={styles.heroButton}
              >
                <Ionicons name="trash-outline" size={19} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        <Card style={styles.summaryCard} elevation={2}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <T variant="h2" numberOfLines={2}>
                {fn.title}
              </T>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                <T variant="caption" tone="muted">
                  {formatDate(fn.date)}
                  {fn.time ? ` · ${fn.time}` : ''}
                </T>
              </View>
              {fn.venue ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <T variant="caption" tone="muted" numberOfLines={2} style={styles.flex}>
                    {fn.venue}
                  </T>
                </View>
              ) : null}
            </View>
            <Badge
              label={fn.status === 'upcoming' ? countdownLabel(fn.date) : 'Completed'}
              tone={fn.status === 'upcoming' ? 'warning' : 'success'}
            />
          </View>

          <View style={styles.statsWrap}>
            <StatRow
              compactLabels
              items={[
                { label: 'Guests', value: formatCount(fn.guestCount ?? 0) },
                { label: 'Moi Collected', value: formatMoneyCompact(fn.collected), tone: 'success' },
                { label: 'Moi Entries', value: formatCount(fn.entryCount) },
              ]}
            />
          </View>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((item) => {
            const active = item.key === tab;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={styles.tab}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={active ? colors.primary : colors.textMuted}
                />
                <T variant="caption" tone={active ? 'primary' : 'muted'}>
                  {item.label}
                </T>
                <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.tabContent}>
          {tab === 'overview' ? <OverviewTab fn={fn} /> : null}

          {tab === 'moi' ? (
            entries.length > 0 ? (
              <>
                <Card style={styles.totalsCard}>
                  <StatRow
                    compactLabels
                    items={[
                      { label: 'Total Entries', value: formatCount(entries.length) },
                      {
                        label: 'Total Amount',
                        value: formatMoneyCompact(fn.collected),
                        tone: 'success',
                      },
                    ]}
                  />
                </Card>
                {entries.map((entry) => (
                  <MoiEntryRow key={entry.id} entry={entry} />
                ))}
              </>
            ) : (
              <EmptyState
                icon="cash-outline"
                title="No moi recorded yet"
                message="Entries you add for this function will appear here."
                actionLabel="Add Moi"
                onAction={() => router.push(`/moi/add?functionId=${fn.id}`)}
              />
            )
          ) : null}

          {tab === 'guests' ? (
            <>
              <Card style={styles.totalsCard}>
                <StatRow
                  compactLabels
                  items={[
                    { label: 'Invited', value: formatCount(guestStats.total) },
                    { label: 'Accepted', value: formatCount(guestStats.accepted), tone: 'success' },
                    { label: 'Pending', value: formatCount(guestStats.pending) },
                    {
                      label: 'Checked In',
                      value: formatCount(guestStats.checkedIn),
                      tone: 'primary',
                    },
                  ]}
                />
              </Card>

              {guests.length > 0 ? (
                <>
                  <View style={styles.filterRow}>
                    {GUEST_FILTERS.map((filter) => {
                      const active = filter.value === guestFilter;
                      return (
                        <Pressable
                          key={filter.value}
                          onPress={() => setGuestFilter(filter.value)}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: active }}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                        >
                          <T variant="caption" tone={active ? 'onPrimary' : 'secondary'}>
                            {filter.label}
                          </T>
                        </Pressable>
                      );
                    })}
                  </View>

                  {visibleGuests.map((guest) => (
                    <GuestRow
                      key={guest.id}
                      guest={guest}
                      onPress={() => router.push(`/guest/new?id=${guest.id}`)}
                      onToggleCheckIn={() => setGuestCheckedIn(guest.id, !guest.checkedIn)}
                    />
                  ))}

                  <Button
                    label="Add Guest"
                    icon="person-add-outline"
                    variant="secondary"
                    block
                    style={styles.addRowButton}
                    onPress={() => router.push(`/guest/new?functionId=${fn.id}`)}
                  />
                </>
              ) : (
                <EmptyState
                  icon="people-circle-outline"
                  title="No guests yet"
                  message="Build the guest list so you can track RSVPs and who actually came."
                  actionLabel="Add Guest"
                  onAction={() => router.push(`/guest/new?functionId=${fn.id}`)}
                />
              )}
            </>
          ) : null}

          {tab === 'expenses' ? (
            expenses.length > 0 ? (
              <>
                <Card style={styles.totalsCard}>
                  <StatRow
                    compactLabels
                    items={[
                      { label: 'Total Spent', value: formatMoneyCompact(fn.expenses), tone: 'danger' },
                      { label: 'Cash', value: formatMoneyCompact(expenseSplit.cash) },
                      { label: 'UPI', value: formatMoneyCompact(expenseSplit.upi) },
                      { label: 'Other', value: formatMoneyCompact(expenseSplit.other) },
                    ]}
                  />
                </Card>

                {expenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    onPress={() => router.push(`/expense/new?id=${expense.id}`)}
                  />
                ))}

                <Button
                  label="Add Expense"
                  icon="add"
                  variant="secondary"
                  block
                  style={styles.addRowButton}
                  onPress={() => router.push(`/expense/new?functionId=${fn.id}`)}
                />
              </>
            ) : (
              <EmptyState
                icon="receipt-outline"
                title="No expenses yet"
                message="Record what this function costs so you can see it against the moi collected."
                actionLabel="Add Expense"
                onAction={() => router.push(`/expense/new?functionId=${fn.id}`)}
              />
            )
          ) : null}

          {tab === 'people' ? (
            contributors.length > 0 ? (
              contributors.map((person) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  onPress={() => router.push(`/person/${person.id}`)}
                />
              ))
            ) : (
              <EmptyState
                icon="people-outline"
                title="Nobody recorded yet"
                message="People appear here once you record their moi."
              />
            )
          ) : null}

          {tab === 'photos' ? (
            <>
              <View style={styles.photoGrid}>
                {(fn.photos ?? []).map((uri) => (
                  <Pressable
                    key={uri}
                    onLongPress={() =>
                      Alert.alert('Remove photo?', undefined, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => removeFunctionPhoto(fn.id, uri),
                        },
                      ])
                    }
                    accessibilityRole="image"
                    accessibilityHint="Long press to remove"
                    style={styles.photoCell}
                  >
                    <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  </Pressable>
                ))}
                <Pressable
                  onPress={addPhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Add photos"
                  style={[styles.photoCell, styles.photoAdd]}
                >
                  <Ionicons name="add" size={26} color={colors.primary} />
                </Pressable>
              </View>
              {(fn.photos ?? []).length === 0 ? (
                <T variant="caption" tone="muted" center style={styles.photoHint}>
                  Add photos from the function. Long press a photo to remove it.
                </T>
              ) : null}
            </>
          ) : null}
        </View>
      </ScreenScroll>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          label="Add Moi"
          icon="add"
          block
          onPress={() => router.push(`/moi/add?functionId=${fn.id}`)}
        />
        <Button label="Share" icon="share-social-outline" variant="success" block onPress={share} />
      </View>
    </Screen>
  );
}

/** Overview tab — the details the host entered, plus the money summary. */
function OverviewTab({ fn }: { fn: FunctionWithStats }) {
  const styles = useStyles();
  const meta = functionTypeMeta(fn.type);
  return (
    <Card>
      <DetailRow label="Function Type" value={`${meta.emoji}  ${meta.label}`} />
      <DetailRow label="Date" value={formatDateLong(fn.date)} />
      {fn.time ? <DetailRow label="Time" value={fn.time} /> : null}
      {fn.village ? <DetailRow label="Village" value={fn.village} /> : null}
      {fn.host ? <DetailRow label="Host" value={fn.host} /> : null}
      <DetailRow label="Created On" value={formatDate(fn.createdAt.slice(0, 10))} />

      {fn.notes ? (
        <View style={styles.detailBlock}>
          <T variant="caption" tone="muted">
            Notes
          </T>
          <T variant="body" style={styles.detailNotes}>
            {fn.notes}
          </T>
        </View>
      ) : null}

      <View style={styles.moneyBlock}>
        <View style={styles.moneyRow}>
          <T variant="small" tone="secondary">
            Moi collected ({fn.entryCount} entries)
          </T>
          <Money value={fn.collected} flow="in" />
        </View>
        <View style={styles.moneyRow}>
          <T variant="small" tone="secondary">
            Expenses ({fn.expenseCount} items)
          </T>
          <Money value={fn.expenses} flow="out" />
        </View>
        <View style={[styles.moneyRow, styles.moneyTotal]}>
          <T variant="bodyStrong">Net</T>
          <Money value={fn.net} flow={fn.net >= 0 ? 'in' : 'out'} variant="h3" />
        </View>
      </View>

      {fn.guestRowCount > 0 ? (
        <View style={styles.moneyBlock}>
          <View style={styles.moneyRow}>
            <T variant="small" tone="secondary">
              Guests invited
            </T>
            <T variant="bodyStrong">{fn.guests}</T>
          </View>
          <View style={styles.moneyRow}>
            <T variant="small" tone="secondary">
              Accepted
            </T>
            <T variant="bodyStrong" tone="success">
              {fn.acceptedGuests}
            </T>
          </View>
          {fn.status === 'completed' ? (
            <View style={styles.moneyRow}>
              <T variant="small" tone="secondary">
                Attended
              </T>
              <T variant="bodyStrong" tone="primary">
                {fn.checkedInGuests}
              </T>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.detailRow}>
      <T variant="small" tone="muted" style={styles.detailLabel}>
        {label}
      </T>
      <T variant="bodyStrong" style={styles.detailValue} numberOfLines={2}>
        {value}
      </T>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  missing: { flex: 1, alignItems: 'center' },
  hero: { height: 210 },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 64, lineHeight: 76 },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  heroButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActions: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { marginHorizontal: spacing.lg, marginTop: -spacing.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  titleText: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  flex: { flex: 1 },
  statsWrap: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tabBar: { paddingHorizontal: spacing.lg, gap: spacing.xxl, marginTop: spacing.xl },
  tab: { alignItems: 'center', gap: 3, paddingBottom: spacing.sm },
  tabUnderline: {
    height: 2.5,
    width: 26,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  tabUnderlineActive: { backgroundColor: colors.primary },
  tabContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  totalsCard: { marginBottom: spacing.lg, paddingVertical: spacing.md },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addRowButton: { marginTop: spacing.sm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    gap: spacing.lg,
  },
  detailLabel: { flexShrink: 0 },
  detailValue: { flex: 1, textAlign: 'right' },
  detailBlock: { marginTop: spacing.md },
  detailNotes: { marginTop: spacing.xs },
  moneyBlock: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
  },
  moneyTotal: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoCell: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  photoAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  photo: { width: '100%', height: '100%' },
  photoHint: { marginTop: spacing.lg },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
}));
