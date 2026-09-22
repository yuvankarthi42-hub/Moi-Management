import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { rsvpMeta } from '../../domain/categories';
import type { GuestView } from '../../domain/selectors';
import { colors, makeStyles, spacing, useColors } from '../../theme';
import { formatPhone } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Chips';
import { T } from '../ui/Text';

/**
 * One invitation on a guest list. The head-count sits next to the name because
 * a single row can cover a whole household.
 */
export function GuestRow({
  guest,
  onPress,
  onToggleCheckIn,
}: {
  guest: GuestView;
  onPress?: () => void;
  onToggleCheckIn?: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const rsvp = rsvpMeta(guest.rsvpStatus);

  return (
    <Card onPress={onPress} style={styles.card} padded={false}>
      <View style={styles.row}>
        <Avatar
          name={guest.guestName}
          uri={guest.person?.photoUri}
          seed={guest.personId ?? guest.id}
          size={42}
        />

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <T variant="bodyStrong" numberOfLines={1} style={styles.name}>
              {guest.guestName}
            </T>
            {guest.guestCount > 1 ? (
              <T variant="caption" tone="muted">
                +{guest.guestCount - 1}
              </T>
            ) : null}
          </View>
          <T variant="caption" tone="muted" numberOfLines={1}>
            {[guest.groupName, guest.village, guest.phone ? formatPhone(guest.phone) : undefined]
              .filter(Boolean)
              .join(' · ') || 'No details'}
          </T>
        </View>

        <View style={styles.trailing}>
          <Badge label={rsvp.label} tone={rsvp.tone} />
          {onToggleCheckIn ? (
            <Pressable
              onPress={onToggleCheckIn}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: guest.checkedIn }}
              accessibilityLabel={`Mark ${guest.guestName} as ${
                guest.checkedIn ? 'not arrived' : 'arrived'
              }`}
              style={styles.checkIn}
            >
              <Ionicons
                name={guest.checkedIn ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={guest.checkedIn ? colors.success : colors.textMuted}
              />
              <T variant="caption" tone={guest.checkedIn ? 'success' : 'muted'}>
                {guest.checkedIn ? 'Arrived' : 'Mark'}
              </T>
            </Pressable>
          ) : null}
        </View>
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
  body: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  checkIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
}));
