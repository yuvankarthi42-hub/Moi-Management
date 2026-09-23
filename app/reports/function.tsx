import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ReportRow } from '../../src/components/app/ReportRow';
import { ReportShell } from '../../src/components/app/ReportShell';
import { Card, EmptyState, IconTile, StatRow, T } from '../../src/components/ui';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import { buildFunctionReport } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing, useColors } from '../../src/theme';
import { formatDate } from '../../src/utils/date';
import { formatCount, formatMoney, formatMoneyCompact } from '../../src/utils/format';

export default function FunctionReportScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { data } = useAppData();

  return (
    <ReportShell title="Function Report" subtitle="Collections by function" kind="function" data={data}>
      {(range) => {
        const report = buildFunctionReport(data, range);

        if (report.rows.length === 0) {
          return (
            <Card>
              <EmptyState
                icon="calendar-outline"
                title="Nothing in this period"
                message="Choose a wider period, or add a function."
              />
            </Card>
          );
        }

        return (
          <>
            <View style={styles.total}>
              <T variant="small" color={colors.onPrimaryMuted}>
                Total Collection
              </T>
              <T variant="display" tone="onPrimary" adjustsFontSizeToFit numberOfLines={1}>
                {formatMoney(report.totalCollection)}
              </T>
            </View>

            <Card style={styles.statsCard}>
              <StatRow
                compactLabels
                items={[
                  { label: 'Total Functions', value: formatCount(report.totalFunctions) },
                  { label: 'Moi Entries', value: formatCount(report.rows.reduce((n, r) => n + r.entryCount, 0)) },
                  { label: 'Average Moi', value: formatMoneyCompact(report.averageMoi) },
                ]}
              />
            </Card>

            <Card padded={false} style={styles.list}>
              {report.rows.map((row, index) => {
                const meta = functionTypeMeta(row.type);
                return (
                  <View key={row.id}>
                    <ReportRow
                      leading={<IconTile emoji={meta.emoji} tint={meta.tint} size={34} />}
                      title={row.title}
                      subtitle={`${formatDate(row.date)} · ${row.entryCount} entries`}
                      amount={row.collected}
                      share={
                        report.totalCollection ? row.collected / report.totalCollection : 0
                      }
                      last={index === report.rows.length - 1}
                    />
                  </View>
                );
              })}
            </Card>

            {report.totalExpenses > 0 ? (
              <Card style={styles.netCard}>
                <View style={styles.netRow}>
                  <T variant="small" tone="secondary">
                    Total expenses
                  </T>
                  <T variant="bodyStrong" tone="danger">
                    {formatMoney(report.totalExpenses)}
                  </T>
                </View>
                <View style={[styles.netRow, styles.netTotal]}>
                  <T variant="bodyStrong">Net after expenses</T>
                  <T
                    variant="h3"
                    tone={report.totalCollection - report.totalExpenses >= 0 ? 'success' : 'danger'}
                  >
                    {formatMoney(report.totalCollection - report.totalExpenses)}
                  </T>
                </View>
              </Card>
            ) : null}
          </>
        );
      }}
    </ReportShell>
  );
}

const useStyles = makeStyles((colors) => ({
  total: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statsCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  list: {
    marginTop: spacing.md,
  },
  netCard: {
    marginTop: spacing.md,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  netTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
}));
