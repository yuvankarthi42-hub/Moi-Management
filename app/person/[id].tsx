import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useRef } from 'react';
import {
  ActivityIndicator, Alert, Animated, Linking, Pressable, StyleSheet, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, Avatar, Badge, Button, Card, DockedFooter, EmptyState, Money, Screen, ScreenScroll, SectionHeader, StatRow, StatusBarScrim, T, useToast } from '../../src/components/ui';
import { functionTypeMeta, paymentTypeMeta } from '../../src/domain/functionTypes';
import { buildReturnMoiReport, describeBalance, selectMoiTimelineForPerson, selectPersonById, type MoiTimelineRow } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, radius, spacing, typography, useColors } from '../../src/theme';
import { countdownLabel, formatDate } from '../../src/utils/date';
import { formatMoney, formatMoneyCompact, formatPhone } from '../../src/utils/format';

/** Kept in sync with `styles.hero`, since the collapse threshold derives from it. */
const HERO_HEIGHT = 200;

/** Height of the collapsed bar, below the status bar inset. */
const BAR_HEIGHT = 56;

export default function PersonProfileScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, removePerson } = useAppData();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  // Drives the collapsed bar's fade. Opacity runs on the native thread, so the
  // bar keeps up with a fast flick the way the function screen's does.
  const scrollY = useRef(new Animated.Value(0)).current;
  const barProgress = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 120, HERO_HEIGHT - 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const person = useMemo(() => (id ? selectPersonById(data, id) : undefined), [data, id]);
  const history = useMemo(() => (id ? selectMoiTimelineForPerson(data, id) : []), [data, id]);
  const balance = useMemo(() => describeBalance(person?.balance ?? 0), [person?.balance]);
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
            showToast({ message: `${person.name} deleted`, variant: 'destructive' });
            router.replace('/(tabs)/people');
          },
        },
      ],
    );
  };

  return (
    <Screen>
      {/* The hero scrolls away, so keep the status-bar strip dark behind it. */}
      <StatusBarScrim color="rgba(12, 6, 32, 0.55)" />

      <Animated.View
        style={[styles.pinnedBar, { height: insets.top + BAR_HEIGHT, opacity: barProgress }]}
        pointerEvents="none"
      />

      <View style={[styles.controls, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/people'))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.controlButton}
        >
          <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
        </Pressable>

        {/* Takes over from the hero as it scrolls out, the way Contacts keeps
            the name in reach once the photo is gone. */}
        <Animated.Text
          numberOfLines={1}
          style={[styles.barTitle, { color: colors.onPrimary, opacity: barProgress }]}
        >
          {person.name}
        </Animated.Text>

        <View style={styles.controlActions}>
          <Pressable
            onPress={() => router.push(`/person/new?id=${person.id}`)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit person"
            style={styles.controlButton}
          >
            <Ionicons name="create-outline" size={20} color={colors.onPrimary} />
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Delete person"
            style={styles.controlButton}
          >
            <Ionicons name="trash-outline" size={19} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>

      <ScreenScroll
        extraBottomSpace={72}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
      >
        <LinearGradient colors={colors.headerGradient} style={styles.hero}>
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
        </LinearGradient>

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
              {
                label: 'Moi Received',
                value: formatMoneyCompact(person.totalReceived),
                tone: 'success',
              },
              {
                label: 'Moi Given',
                value: formatMoneyCompact(person.totalGiven),
                tone: 'danger',
              },
              {
                label: 'Balance',
                value: formatMoneyCompact(balance.amount),
                tone: balance.state === 'to-return' ? 'warning' : 'default',
              },
            ]}
          />
        </Card>

        {/* States the balance in words — a signed number alone leaves the
            reader working out which side of the exchange is ahead. */}
        <View
          style={[
            styles.balanceStrip,
            balance.state === 'to-return'
              ? styles.balanceWarn
              : balance.state === 'ahead'
                ? styles.balanceAhead
                : styles.balanceSettled,
          ]}
        >
          <Ionicons
            name={
              balance.state === 'to-return'
                ? 'gift-outline'
                : balance.state === 'ahead'
                  ? 'checkmark-done-outline'
                  : 'checkmark-circle-outline'
            }
            size={17}
            color={
              balance.state === 'to-return'
                ? colors.warning
                : balance.state === 'ahead'
                  ? colors.success
                  : colors.textSecondary
            }
          />
          <T
            variant="smallStrong"
            tone={
              balance.state === 'to-return'
                ? 'warning'
                : balance.state === 'ahead'
                  ? 'success'
                  : 'secondary'
            }
            style={styles.balanceText}
          >
            {balance.state === 'to-return'
              ? `${formatMoney(balance.amount)} still to return to ${person.name}`
              : balance.state === 'ahead'
                ? `You have given ${formatMoney(balance.amount)} more than received`
                : 'Settled — both sides match'}
          </T>
        </View>

        <Card style={styles.detailCard}>
          {person.phone ? (
            <DetailRow icon="call-outline" label="Phone" value={formatPhone(person.phone)} />
          ) : null}
          {person.village ? (
            <DetailRow icon="location-outline" label="Village" value={person.village} />
          ) : null}
          {person.relation ? (
            <DetailRow icon="people-outline" label="Relation" value={person.relation} />
          ) : null}
          <DetailRow
            icon="calendar-outline"
            label="Functions"
            value={`${person.functionCount} attended`}
          />
          {person.notes ? (
            <DetailRow icon="document-text-outline" label="Notes" value={person.notes} />
          ) : null}
          {!person.phone && !person.village && !person.relation ? (
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
                    {/* The suggestion matches their most recent moi, while the
                        balance above is the lifetime net — two different
                        questions, so each says which basis it uses. */}
                    <View style={styles.suggestLabel}>
                      <T variant="small" tone="secondary">
                        Suggested return
                      </T>
                      <T variant="caption" tone="muted">
                        Matches their last moi of {formatMoney(row.lastReceived)}
                      </T>
                    </View>
                    <Money value={row.suggested} flow="out" variant="h3" />
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        <SectionHeader title="Moi History" actionLabel="Both directions" onAction={() => undefined} />
        <View style={styles.sideMargin}>
          {history.length > 0 ? (
            <Card padded={false}>
              {history.map((entry, index) => (
                <HistoryRow
                  key={`${entry.direction}-${entry.id}`}
                  row={entry}
                  divider={index > 0}
                  onPress={
                    entry.functionId
                      ? () => router.push(`/function/${entry.functionId}`)
                      : undefined
                  }
                />
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

      </ScreenScroll>

      {/* Docked rather than tacked onto the end of the scroll: a person with a
          long moi history would otherwise push both actions off-screen. */}
      <DockedFooter>
        <View style={styles.footerActions}>
          <Button
            label="Add received"
            icon="arrow-down-circle-outline"
            variant="outline"
            block
            onPress={() => router.push(`/moi/add?personId=${person.id}`)}
          />
          <Button
            label="Record given"
            icon="arrow-up-circle-outline"
            block
            onPress={() => router.push(`/moi/given?personId=${person.id}`)}
          />
        </View>
      </DockedFooter>
    </Screen>
  );
}

/**
 * One line of the two-way history. Received and given sit on the same
 * timeline, so the arrow and colour carry the direction rather than the row
 * living in a separate list.
 */
function HistoryRow({
  row,
  divider,
  onPress,
}: {
  row: MoiTimelineRow;
  divider: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const received = row.direction === 'received';

  const body = (
    <>
      <Ionicons
        name={received ? 'arrow-down-circle' : 'arrow-up-circle'}
        size={20}
        color={received ? colors.success : colors.danger}
      />
      <View style={styles.historyBody}>
        <T variant="body" numberOfLines={1}>
          {row.title}
        </T>
        <T variant="caption" tone="muted" numberOfLines={1}>
          {formatDate(row.date)} · {paymentTypeMeta(row.paymentType).label} ·{' '}
          {received ? 'received' : 'you gave'}
        </T>
      </View>
      <T variant="bodyStrong" tone={received ? 'success' : 'danger'}>
        {received ? '+' : '\u2212'}
        {formatMoney(row.amount)}
      </T>
    </>
  );

  const style = [styles.historyRow, divider && styles.historyDivider];

  if (!onPress) return <View style={style}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, ${received ? 'received' : 'given'}`}
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [...style, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
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
  hero: {
    height: HERO_HEIGHT,
    justifyContent: 'flex-end',
    paddingBottom: spacing.xxl,
  },
  pinnedBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.headerGradient[0],
    zIndex: 5,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    // A scrim so the icons stay legible over the hero before the bar has
    // faded in behind them.
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlActions: { flexDirection: 'row', gap: spacing.sm },
  barTitle: {
    flex: 1,
    ...typography.h3,
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
    marginTop: -spacing.xxl,
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
  balanceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  balanceWarn: {
    backgroundColor: colors.warningSoft,
  },
  balanceAhead: {
    backgroundColor: colors.successSoft,
  },
  balanceSettled: {
    backgroundColor: colors.surfaceAlt,
  },
  balanceText: {
    flex: 1,
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
  suggestLabel: {
    flex: 1,
    marginRight: spacing.md,
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
  footerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
}));
