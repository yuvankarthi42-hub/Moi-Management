import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HeroTotal } from '../../src/components/app/HeroTotal';
import { ReportRow } from '../../src/components/app/ReportRow';
import { ReportShell } from '../../src/components/app/ReportShell';
import { Card, EmptyState, IconTile, StatRow } from '../../src/components/ui';
import { buildExpenseReport } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing } from '../../src/theme';
import { formatMoney, formatMoneyCompact } from '../../src/utils/format';

/** What functions cost, broken down by category (spec §15). */
export default function ExpenseReportScreen() {
  const styles = useStyles();
  const { data } = useAppData();

  return (
    <ReportShell
      title="Expense Report"
      subtitle="What your functions cost"
      kind="expense"
      data={data}
    >
      {(range) => {
        const report = buildExpenseReport(data, range);

        if (report.rows.length === 0) {
          return (
            <Card>
              <EmptyState
                icon="receipt-outline"
                title="No expenses recorded"
                message="Add expenses from a function's Expenses tab to see them summarised here."
              />
            </Card>
          );
        }

        return (
          <>
            <HeroTotal
              tone="danger"
              label={`Total spent across ${report.functionCount} ${
                report.functionCount === 1 ? 'function' : 'functions'
              }`}
              value={formatMoney(report.total)}
            />

            <Card style={styles.statsCard}>
              <StatRow
                compactLabels
                items={[
                  { label: 'Cash', value: formatMoneyCompact(report.split.cash) },
                  { label: 'UPI', value: formatMoneyCompact(report.split.upi) },
                  { label: 'Other', value: formatMoneyCompact(report.split.other) },
                ]}
              />
            </Card>

            <Card padded={false} style={styles.list}>
              {report.rows.map((row, index) => (
                <ReportRow
                  key={row.key}
                  leading={<IconTile emoji={row.emoji} tint={row.tint} size={34} />}
                  title={row.label}
                  subtitle={`${row.count} ${row.count === 1 ? 'item' : 'items'}`}
                  amount={row.total}
                  flow="out"
                  share={report.total ? row.total / report.total : 0}
                  last={index === report.rows.length - 1}
                />
              ))}
            </Card>
          </>
        );
      }}
    </ReportShell>
  );
}

const useStyles = makeStyles((colors) => ({
  statsCard: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  list: {
    marginTop: spacing.md,
  },
}));
