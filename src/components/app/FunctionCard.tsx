import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { functionTypeMeta } from '../../domain/functionTypes';
import type { FunctionWithStats } from '../../domain/selectors';
import { colors, radius, spacing } from '../../theme';
import { countdownLabel, formatDate } from '../../utils/date';
import { Badge } from '../ui/Chips';
import { IconTile } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Money, T } from '../ui/Text';

/**
 * A function in a list: type icon, title, date and place, then the money and
 * entry count on the right. Used on Home and the Functions tab.
 */
export function FunctionCard({
  fn,
  onPress,
  showCountdown = false,
}: {
  fn: FunctionWithStats;
  onPress: () => void;
  showCountdown?: boolean;
}) {
  const meta = functionTypeMeta(fn.type);
  const upcoming = fn.status === 'upcoming';

  return (
    <Card onPress={onPress} style={styles.card} padded={false}>
      <View style={styles.row}>
        <IconTile emoji={meta.emoji} tint={meta.tint} />

        <View style={styles.body}>
          <T variant="bodyStrong" numberOfLines={1}>
            {fn.title}
          </T>
          <View style={styles.metaRow}>
            <T variant="caption" tone="muted" numberOfLines={1}>
              {formatDate(fn.date)}
              {fn.village ? ` · ${fn.village}` : ''}
            </T>
          </View>
          {showCountdown && upcoming ? (
            <Badge label={countdownLabel(fn.date)} tone="warning" style={styles.badge} />
          ) : null}
        </View>

        <View style={styles.trailing}>
          {upcoming && fn.entryCount === 0 ? (
            <>
              <T variant="smallStrong" tone="primary">
                Upcoming
              </T>
              <T variant="caption" tone="muted" style={styles.trailingSub}>
                {fn.guestCount ? `${fn.guestCount} Guests` : 'No entries yet'}
              </T>
            </>
          ) : (
            <>
              <Money value={fn.collected} flow="in" variant="bodyStrong" />
              <T variant="caption" tone="muted" style={styles.trailingSub}>
                {fn.entryCount} {fn.entryCount === 1 ? 'Entry' : 'Entries'}
              </T>
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

/**
 * The large hero card for the next upcoming function on Home — bigger type, a
 * countdown badge and the venue spelled out.
 */
export function UpcomingFunctionCard({
  fn,
  onPress,
}: {
  fn: FunctionWithStats;
  onPress: () => void;
}) {
  const meta = functionTypeMeta(fn.type);

  return (
    <Card onPress={onPress} style={styles.hero} padded={false} elevation={2}>
      <View style={styles.heroRow}>
        <IconTile emoji={meta.emoji} tint={meta.tint} size={52} />
        <View style={styles.heroBody}>
          <T variant="h3" numberOfLines={1}>
            {fn.title}
          </T>
          <View style={styles.heroMeta}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <T variant="caption" tone="muted" numberOfLines={1} style={styles.heroMetaText}>
              {formatDate(fn.date)}
              {fn.time ? ` · ${fn.time}` : ''}
            </T>
          </View>
          {fn.venue ? (
            <View style={styles.heroMeta}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <T variant="caption" tone="muted" numberOfLines={1} style={styles.heroMetaText}>
                {fn.venue}
              </T>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.heroFooter}>
        <Badge label={countdownLabel(fn.date)} tone="warning" />
        <T variant="caption" tone="muted">
          {fn.guestCount ? `${fn.guestCount} guests invited` : 'Tap to add details'}
        </T>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
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
    marginTop: 3,
  },
  badge: {
    marginTop: spacing.xs,
  },
  trailing: {
    alignItems: 'flex-end',
    minWidth: 76,
  },
  trailingSub: {
    marginTop: 2,
  },
  hero: {
    marginHorizontal: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  heroBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: spacing.xs,
  },
  heroMetaText: {
    flex: 1,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
});
