import React from 'react';
import { StyleSheet, View } from 'react-native';

import { expenseCategoryMeta } from '../../domain/categories';
import { paymentTypeMeta } from '../../domain/functionTypes';
import type { Expense } from '../../domain/models';
import { spacing } from '../../theme';
import { formatDate } from '../../utils/date';
import { IconTile } from '../ui/Avatar';
import { Card } from '../ui/Card';
import { Money, T } from '../ui/Text';

/** One expense in a function's expense list. */
export function ExpenseRow({ expense, onPress }: { expense: Expense; onPress?: () => void }) {
  const meta = expenseCategoryMeta(expense.category);
  const payment = paymentTypeMeta(expense.paymentType);

  return (
    <Card onPress={onPress} style={styles.card} padded={false}>
      <View style={styles.row}>
        <IconTile emoji={meta.emoji} tint={meta.tint} size={42} />

        <View style={styles.body}>
          <T variant="bodyStrong" numberOfLines={1}>
            {meta.label}
          </T>
          <T variant="caption" tone="muted" numberOfLines={1}>
            {[formatDate(expense.date), payment.label, expense.paidBy]
              .filter(Boolean)
              .join(' · ')}
          </T>
          {expense.notes ? (
            <T variant="caption" tone="muted" numberOfLines={1}>
              {expense.notes}
            </T>
          ) : null}
        </View>

        <Money value={expense.amount} flow="out" variant="bodyStrong" />
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
    gap: spacing.md,
  },
  body: {
    flex: 1,
  },
});
