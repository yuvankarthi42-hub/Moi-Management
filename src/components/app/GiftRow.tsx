import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import type { GiftView } from '../../domain/selectors';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import { formatDate } from '../../utils/date';
import { formatMoney } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { T } from '../ui/Text';

/**
 * A gift, led by what it was.
 *
 * The name is the headline and the value — when the host bothered to set one —
 * is a quiet line underneath. A gift is remembered as "the silver bowl", not
 * as a figure, and most of them never get a figure at all.
 */
export function GiftRow({
  gift,
  /** Shows the giver rather than the function — for a function's own list. */
  showPerson = false,
  onPress,
}: {
  gift: GiftView;
  showPerson?: boolean;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();

  const meta = showPerson
    ? [gift.person?.village, formatDate(gift.recordedAt.slice(0, 10))]
    : [gift.functionTitle, formatDate(gift.recordedAt.slice(0, 10))];

  return (
    <Card onPress={onPress} style={styles.card} padded={false}>
      <View style={styles.row}>
        {showPerson ? (
          <Avatar name={gift.person?.name ?? '?'} seed={gift.personId} size={42} />
        ) : (
          <View style={styles.icon}>
            <Ionicons name="gift" size={19} color={colors.warning} />
          </View>
        )}

        <View style={styles.body}>
          <T variant="bodyStrong" numberOfLines={1}>
            {showPerson ? gift.person?.name ?? 'Unknown' : gift.name}
          </T>
          <T variant="caption" tone="muted" numberOfLines={1}>
            {showPerson ? gift.name : meta.filter(Boolean).join(' · ')}
          </T>
        </View>

        {gift.value ? (
          <T variant="smallStrong" tone="warning">
            {formatMoney(gift.value)}
          </T>
        ) : null}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    marginBottom: spacing.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: `${colors.warning}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
}));
