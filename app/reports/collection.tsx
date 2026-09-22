import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ReportShell } from '../../src/components/app/ReportShell';
import { Card, EmptyState, StatRow, T } from '../../src/components/ui';
import { buildCollectionReport } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing, useColors } from '../../src/theme';
import { formatMonth } from '../../src/utils/date';
import { formatMoney, formatMoneyCompact } from '../../src/utils/format';

/** Moi collected over time, month by month (spec §15). */
export default function CollectionReportScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { data } = useAppData();

  return (
    <ReportShell
      title="Moi Collection Report"
      subtitle="How collections moved over time"
      kind="collection"
      data={data}
    >
      {(range) => {
        const report = buildCollectionReport(data, range);

        if (report.rows.length === 0) {
          return (
            <Card>
              <EmptyState
                icon="trending-up-outline"
                title="Nothing collected yet"
                message="Record moi against a function and its month appears here."
              />
            </Card>
          );
        }

        return (
          <>
            <View style={styles.total}>
              <T variant="small" color={colors.onPrimaryMuted}>
                Collected across {report.rows.length}{' '}
                {report.rows.length === 1 ? 'month' : 'months'}
              </T>
              <T variant="display" tone="onPrimary" adjustsFontSizeToFit numberOfLines={1}>
                {formatMoney(report.total)}
              </T>
            </View>

            <Card style={styles.statsCard}>
              <StatRow
                compactLabels
                items={[
                  { label: 'Average entry', value: formatMoneyCompact(report.averageEntry) },
                  { label: 'Cash', value: formatMoneyCompact(report.split.cash) },
                  { label: 'UPI', value: formatMoneyCompact(report.split.upi) },
                ]}
              />
            </Card>

            {/* A simple horizontal bar per month reads better on a narrow
                screen than a cramped chart, and needs no chart library. */}
            <Card style={styles.chart}>
              {report.rows.map((row) => (
                <View key={row.month} style={styles.monthRow}>
                  <View style={styles.monthHeader}>
                    <T variant="small">{formatMonth(`${row.month}-01`)}</T>
                    <T variant="smallStrong" tone="success">
                      {formatMoneyCompact(row.total)}
                    </T>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${Math.max((row.total / report.peak) * 100, 2)}%` },
                      ]}
                    />
                  </View>
                  <T variant="caption" tone="muted">
                    {row.entryCount} {row.entryCount === 1 ? 'entry' : 'entries'}
                  </T>
                </View>
              ))}
            </Card>
          </>
        );
      }}
    </ReportShell>
  );
}

const useStyles = makeStyles((colors) => ({
  total: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statsCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  chart: {
    marginTop: spacing.md,
  },
  monthRow: {
    marginBottom: spacing.lg,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 3,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
}));
