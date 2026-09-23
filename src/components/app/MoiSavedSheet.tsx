import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, radius, shadow, spacing, useColors } from '../../theme';
import { printReceipt, shareReceipt, type ReceiptData } from '../../services/receiptService';
import { formatMoney } from '../../utils/format';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Confetti } from '../ui/Confetti';
import { T } from '../ui/Text';

export interface MoiSavedDetails {
  amount: number;
  personName: string;
  functionTitle?: string;
  paymentLabel?: string;
  /** Wording flips for moi given back rather than received. */
  direction?: 'received' | 'given';
  /** Present for a received entry, which is the only kind with a receipt. */
  receipt?: ReceiptData;
}

/**
 * Confirms a saved moi entry, and offers to record the next one.
 *
 * At a function the host works through a queue of guests, so the useful thing
 * after a save is not "OK" but "add another" — this keeps them in the flow
 * while still showing exactly what was written down.
 */
export function MoiSavedSheet({
  visible,
  details,
  onAddAnother,
  onDone,
}: {
  visible: boolean;
  details?: MoiSavedDetails;
  onAddAnother: () => void;
  onDone: () => void;
}) {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const share = async (data: ReceiptData) => {
    const outcome = await shareReceipt(data);
    if (outcome === 'copied') {
      showToast({ message: 'Receipt copied to the clipboard', aboveTabBar: false });
    } else if (outcome === 'unavailable') {
      showToast({
        message: 'Sharing is unavailable here \u2014 use Print instead',
        variant: 'error',
        aboveTabBar: false,
      });
    }
  };
  const given = details?.direction === 'given';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Confetti run={visible} />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm },
            shadow(3),
          ]}
        >
          <View style={styles.tick}>
            <Ionicons name="checkmark" size={26} color={colors.success} />
          </View>

          <T variant="display" tone={given ? 'danger' : 'success'} center style={styles.amount}>
            {formatMoney(details?.amount ?? 0)}
          </T>

          <T variant="body" center>
            {given
              ? `Moi to ${details?.personName ?? 'them'} saved`
              : `Moi from ${details?.personName ?? 'them'} saved`}
          </T>

          {details?.functionTitle || details?.paymentLabel ? (
            <T variant="caption" tone="muted" center style={styles.meta}>
              {[details?.functionTitle, details?.paymentLabel].filter(Boolean).join(' · ')}
            </T>
          ) : null}

          {/* A guest often asks for something in writing, so the receipt is
              offered right here rather than hidden behind the entry later. */}
          {details?.receipt ? (
            <View style={styles.actions}>
              <Button
                label="Print"
                icon="print-outline"
                variant="outline"
                size="md"
                block
                onPress={() => printReceipt(details.receipt!)}
              />
              <Button
                label="Share"
                icon="share-social-outline"
                variant="outline"
                size="md"
                block
                onPress={() => share(details.receipt!)}
              />
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button label="Done" variant="outline" block onPress={onDone} />
            <Button label="Add another" icon="add" block onPress={onAddAnother} />
          </View>

          <Pressable
            onPress={onDone}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.close}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  tick: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: {
    marginTop: spacing.md,
  },
  meta: {
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  close: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
}));
