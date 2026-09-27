import React, { useMemo } from 'react';
import { View } from 'react-native';

import { paymentTypeMeta } from '../../domain/functionTypes';
import { buildReceipt, printReceipt, shareReceipt } from '../../services/receiptService';
import { useAppData } from '../../store/AppDataProvider';
import { makeStyles, spacing } from '../../theme';
import { formatDate, formatTime } from '../../utils/date';
import { formatMoney } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { T } from '../ui/Text';

/**
 * What a single recorded moi looks like after the fact.
 *
 * Reached by tapping an entry in a function's moi list, so a receipt can be
 * printed or re-sent later without re-recording the entry.
 */
export function MoiEntrySheet({
  entryId,
  onClose,
  onOpenPerson,
}: {
  entryId?: string;
  onClose: () => void;
  onOpenPerson: (personId: string) => void;
}) {
  const styles = useStyles();
  const { data } = useAppData();
  const { showToast } = useToast();

  const share = async () => {
    if (!receipt) return;
    const outcome = await shareReceipt(receipt);
    if (outcome === 'copied') {
      showToast({ message: 'Receipt copied to the clipboard', aboveTabBar: false });
    } else if (outcome === 'print-instead') {
      showToast({
        message: 'Use Print \u2192 save as PDF to get the file',
        variant: 'info',
        aboveTabBar: false,
      });
    } else if (outcome === 'unavailable') {
      showToast({ message: 'Could not share the receipt', variant: 'error', aboveTabBar: false });
    }
  };

  const entry = useMemo(
    () => data.moiEntries.find((e) => e.id === entryId),
    [data.moiEntries, entryId],
  );
  const person = data.people.find((p) => p.id === entry?.personId);
  const fn = data.functions.find((f) => f.id === entry?.functionId);

  const receipt = useMemo(
    () =>
      entry
        ? buildReceipt({
            entry,
            functionEntries: data.moiEntries,
            person,
            fn,
            hostName: data.profile.name,
          })
        : undefined,
    [entry, data.moiEntries, person, fn, data.profile.name],
  );

  return (
    <Sheet visible={entryId != null && entry != null} onClose={onClose} title="Moi entry">
      {entry && receipt ? (
        <View style={styles.body}>
          <View style={styles.identity}>
            <Avatar
              name={person?.name ?? 'Guest'}
              uri={person?.photoUri}
              seed={entry.personId}
              size={48}
            />
            <View style={styles.identityText}>
              <T variant="h3" numberOfLines={1}>
                {person?.name ?? 'Guest'}
              </T>
              <T variant="caption" tone="muted" numberOfLines={1}>
                {[person?.village, receipt.receiptNo].filter(Boolean).join(' · ')}
              </T>
            </View>
            <T variant="h2" tone="success">
              {formatMoney(entry.amount)}
            </T>
          </View>

          <View style={styles.rows}>
            <Row label="Function" value={fn?.title ?? '—'} />
            <Row label="Date" value={formatDate(receipt.functionDate)} />
            <Row label="Payment" value={paymentTypeMeta(entry.paymentType).label} />
            <Row label="Recorded" value={formatTime(entry.recordedAt)} />
            {entry.notes ? <Row label="Note" value={entry.notes} /> : null}
          </View>

          <View style={styles.actions}>
            <Button
              label="Print"
              icon="print-outline"
              variant="outline"
              block
              onPress={() => printReceipt(receipt)}
            />
            <Button
              label="Share"
              icon="share-social-outline"
              variant="outline"
              block
              onPress={share}
            />
          </View>

          <Button
            label={`Open ${person?.name ?? 'person'}`}
            icon="person-outline"
            variant="ghost"
            block
            style={styles.openPerson}
            onPress={() => onOpenPerson(entry.personId)}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <T variant="small" tone="muted">
        {label}
      </T>
      <T variant="bodyStrong" style={styles.rowValue} numberOfLines={2}>
        {value}
      </T>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
  },
  rows: {
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  openPerson: {
    marginTop: spacing.xs,
  },
}));
