import React from 'react';
import { View } from 'react-native';

import { ReportShell } from '../../src/components/app/ReportShell';
import { Card, EmptyState, Money, T } from '../../src/components/ui';
import { PAYMENT_TYPES } from '../../src/domain/functionTypes';
import { buildPaymentMethodReport, type PaymentSplit } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, radius, spacing, useColors } from '../../src/theme';
import { formatMoney } from '../../src/utils/format';

/** How moi arrived and how expenses were settled (spec §15). */
export default function PaymentMethodReportScreen() {
  const { data } = useAppData();

  return (
    <ReportShell
      title="Payment Method Report"
      subtitle="Cash, UPI and other"
      kind="payment-method"
      data={data}
    >
      {(range) => {
        const report = buildPaymentMethodReport(data, range);

        if (report.moi.total === 0 && report.expenses.total === 0) {
          return (
            <Card>
              <EmptyState
                icon="card-outline"
                title="Nothing to split yet"
                message="Record some moi or expenses and the payment breakdown appears here."
              />
            </Card>
          );
        }

        return (
          <>
            <SplitCard
              title="Moi received"
              split={report.moi}
              counts={report.moiCounts}
              flow="in"
            />
            <SplitCard title="Expenses paid" split={report.expenses} flow="out" />
          </>
        );
      }}
    </ReportShell>
  );
}

function SplitCard({
  title,
  split,
  counts,
  flow,
}: {
  title: string;
  split: PaymentSplit;
  counts?: Record<string, number>;
  flow: 'in' | 'out';
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <T variant="h3">{title}</T>
        <Money value={split.total} flow={flow} variant="h3" />
      </View>

      {split.total === 0 ? (
        <T variant="small" tone="muted" center style={styles.none}>
          Nothing recorded in this period.
        </T>
      ) : (
        PAYMENT_TYPES.map((method) => {
          const amount = split[method.value];
          const share = split.total ? amount / split.total : 0;
          return (
            <View key={method.value} style={styles.methodRow}>
              <View style={styles.methodHeader}>
                <T variant="body">{method.label}</T>
                <View style={styles.methodValue}>
                  {counts ? (
                    <T variant="caption" tone="muted">
                      {counts[method.value] ?? 0} entries ·{' '}
                    </T>
                  ) : null}
                  <T variant="bodyStrong">{formatMoney(amount)}</T>
                </View>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.max(share * 100, amount > 0 ? 2 : 0)}%`,
                      backgroundColor: flow === 'in' ? colors.success : colors.danger,
                    },
                  ]}
                />
              </View>
              <T variant="caption" tone="muted">
                {(share * 100).toFixed(1)}% of the total
              </T>
            </View>
          );
        })
      )}
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  none: {
    paddingVertical: spacing.lg,
  },
  methodRow: {
    marginBottom: spacing.lg,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  methodValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
}));
