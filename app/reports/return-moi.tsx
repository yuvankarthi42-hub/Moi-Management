import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ReportShell } from '../../src/components/app/ReportShell';
import {
  Avatar, Badge, Button, Card, EmptyState, Money, T,
} from '../../src/components/ui';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import { buildReturnMoiReport, type ReturnMoiRow } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing, useColors } from '../../src/theme';
import { countdownLabel, formatDate } from '../../src/utils/date';
import { formatMoney } from '../../src/utils/format';

/**
 * Who the household owes a moi to, and roughly how much.
 *
 * Unlike the other reports this one is forward-looking, so the period filter is
 * hidden — the list is always "upcoming", ordered by how soon each function is.
 */
export default function ReturnMoiScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { data, markMoiReturned } = useAppData();
  const router = useRouter();

  const rows = useMemo(() => buildReturnMoiReport(data, { withinDays: 365 }), [data]);
  const pending = rows.filter((r) => r.returned === 0);
  const done = rows.filter((r) => r.returned > 0);

  const confirmReturn = (row: ReturnMoiRow) => {
    Alert.alert(
      'Mark as returned?',
      `Record ${formatMoney(row.suggested)} given to ${row.person.name} for ${row.event.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark returned', onPress: () => markMoiReturned(row.event.id, row.suggested) },
      ],
    );
  };

  return (
    <ReportShell
      title="Return Moi Report"
      subtitle="People you may need to give to"
      kind="return-moi"
      data={data}
      showRangeFilter={false}
    >
      {() => {
        if (rows.length === 0) {
          return (
            <Card>
              <EmptyState
                icon="gift-outline"
                title="Nothing due"
                message="When a guest has a function coming up, add it to their profile and it will show here with a suggested amount."
              />
            </Card>
          );
        }

        return (
          <>
            <View style={styles.banner}>
              <T style={styles.bannerEmoji} allowFontScaling={false}>
                🎁
              </T>
              <View style={styles.bannerText}>
                <T variant="bodyStrong" tone="onPrimary" numberOfLines={2}>
                  {pending.length} upcoming {pending.length === 1 ? 'function' : 'functions'}
                </T>
                <T variant="caption" color={colors.onPrimaryMuted}>
                  Suggested total {formatMoney(pending.reduce((s, r) => s + r.suggested, 0))}
                </T>
              </View>
            </View>

            {pending.map((row) => (
              <ReturnCard
                key={row.event.id}
                row={row}
                onOpen={() => router.push(`/person/${row.person.id}`)}
                onMarkReturned={() => confirmReturn(row)}
              />
            ))}

            {done.length > 0 ? (
              <>
                <T variant="smallStrong" tone="secondary" style={styles.doneHeading}>
                  Already returned
                </T>
                {done.map((row) => (
                  <ReturnCard
                    key={row.event.id}
                    row={row}
                    onOpen={() => router.push(`/person/${row.person.id}`)}
                  />
                ))}
              </>
            ) : null}
          </>
        );
      }}
    </ReportShell>
  );
}

function ReturnCard({
  row,
  onOpen,
  onMarkReturned,
}: {
  row: ReturnMoiRow;
  onOpen: () => void;
  onMarkReturned?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const meta = functionTypeMeta(row.event.type);
  // Red inside a week, amber inside a month, neutral beyond that.
  const tone = row.daysAway <= 7 ? 'danger' : row.daysAway <= 30 ? 'warning' : 'info';

  return (
    <Card style={styles.card} padded={false}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={row.person.name}>
        <View style={styles.cardTop}>
          <Avatar
            name={row.person.name}
            uri={row.person.photoUri}
            seed={row.person.id}
            size={46}
          />
          <View style={styles.cardBody}>
            {/* The person leads: they are who you hand the moi to. The family
                is secondary context, and several people share one family. */}
            <T variant="bodyStrong" numberOfLines={1}>
              {row.person.name}
            </T>
            <View style={styles.eventRow}>
              <T style={styles.eventEmoji} allowFontScaling={false}>
                {meta.emoji}
              </T>
              <T variant="caption" tone="muted" numberOfLines={1} style={styles.flex}>
                {row.event.title} · {formatDate(row.event.date)}
              </T>
            </View>
            {row.familyName || row.person.village ? (
              <T variant="caption" tone="muted" numberOfLines={1}>
                {[row.familyName, row.person.village].filter(Boolean).join(' · ')}
              </T>
            ) : null}
          </View>
          <Badge label={countdownLabel(row.event.date)} tone={tone} />
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountBlock}>
            <T variant="caption" tone="muted">
              Last received
            </T>
            <Money value={row.lastReceived} flow="neutral" variant="smallStrong" />
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountBlock}>
            <T variant="caption" tone="muted">
              {row.returned > 0 ? 'You gave' : 'Suggested'}
            </T>
            <Money
              value={row.returned > 0 ? row.returned : row.suggested}
              flow={row.returned > 0 ? 'in' : 'out'}
              variant="bodyStrong"
            />
          </View>
        </View>
      </Pressable>

      {onMarkReturned ? (
        <View style={styles.cardFooter}>
          <Button
            label="Mark as returned"
            icon="checkmark-circle-outline"
            variant="ghost"
            size="sm"
            block
            onPress={onMarkReturned}
          />
        </View>
      ) : (
        <View style={styles.returnedFooter}>
          <Ionicons name="checkmark-circle" size={15} color={colors.success} />
          <T variant="caption" tone="success">
            Returned
          </T>
        </View>
      )}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  bannerEmoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  bannerText: {
    flex: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  eventEmoji: {
    fontSize: 12,
    lineHeight: 16,
  },
  flex: {
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm + 2,
  },
  amountBlock: {
    flex: 1,
    alignItems: 'center',
  },
  amountDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.xs,
  },
  returnedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  doneHeading: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
}));
