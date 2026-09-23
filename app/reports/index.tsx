import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppHeader, Button, Card, ListRow, RowDivider, Screen, ScreenScroll, StatRow, T,
} from '../../src/components/ui';
import { selectOverview } from '../../src/domain/selectors';
import { exportReport, type ExportFormat } from '../../src/services/exportService';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing } from '../../src/theme';
import { formatCount, formatMoneyCompact } from '../../src/utils/format';

const REPORTS = [
  {
    href: '/reports/function',
    icon: 'calendar-outline' as const,
    tint: '#E8912A',
    title: 'Function Report',
    subtitle: 'View collections by function',
  },
  {
    href: '/reports/person',
    icon: 'person-outline' as const,
    tint: '#2563EB',
    title: 'Person Report',
    subtitle: 'See how much each person gave',
  },
  {
    href: '/reports/village',
    icon: 'location-outline' as const,
    tint: '#0FA968',
    title: 'Village Report',
    subtitle: 'Collections grouped by village',
  },
  {
    href: '/reports/family',
    icon: 'home-outline' as const,
    tint: '#9333EA',
    title: 'Family Report',
    subtitle: 'Family wise collection summary',
  },
  {
    href: '/reports/return-moi',
    icon: 'gift-outline' as const,
    tint: '#DB2777',
    title: 'Return Moi Report',
    subtitle: 'People to whom you may give',
  },
  {
    href: '/reports/top-contributors',
    icon: 'trophy-outline' as const,
    tint: '#CA8A04',
    title: 'Top Contributors',
    subtitle: 'People who contributed more',
  },
  {
    href: '/reports/collection',
    icon: 'trending-up-outline' as const,
    tint: '#0FA968',
    title: 'Moi Collection Report',
    subtitle: 'Collections month by month',
  },
  {
    href: '/reports/expense',
    icon: 'receipt-outline' as const,
    tint: '#E23A3A',
    title: 'Expense Report',
    subtitle: 'What each function cost, by category',
  },
  {
    href: '/reports/payment-method',
    icon: 'card-outline' as const,
    tint: '#0891B2',
    title: 'Payment Method Report',
    subtitle: 'Cash, UPI and other splits',
  },
];

export default function ReportsScreen() {
  const styles = useStyles();
  const { data } = useAppData();
  const router = useRouter();
  const [busy, setBusy] = useState<ExportFormat | undefined>();

  const overview = useMemo(() => selectOverview(data), [data]);

  const handleExport = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await exportReport({ kind: 'summary', data, format });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen>
      <AppHeader
        title="Reports"
        subtitle="Everything you have collected, summarised"
        showBack
        bleed={46}
      />

      <ScreenScroll>

        <Card style={styles.statsCard} elevation={2}>
          <StatRow
            compactLabels
            items={[
              { label: 'Functions', value: formatCount(overview.functionCount) },
              {
                label: 'Collected',
                value: formatMoneyCompact(overview.totalMoi),
                tone: 'success',
              },
              {
                label: 'Spent',
                value: formatMoneyCompact(overview.totalExpenses),
                tone: 'danger',
              },
              { label: 'Entries', value: formatCount(overview.entryCount) },
            ]}
          />
        </Card>

        <Card style={styles.list} padded={false}>
          {REPORTS.map((report, index) => (
            <View key={report.href}>
              {index > 0 ? <RowDivider /> : null}
              <ListRow
                icon={report.icon}
                iconTint={report.tint}
                title={report.title}
                subtitle={report.subtitle}
                onPress={() => router.push(report.href as never)}
              />
            </View>
          ))}
        </Card>

        <View style={styles.exportBlock}>
          <T variant="smallStrong" tone="secondary" style={styles.exportLabel}>
            Export everything
          </T>
          <View style={styles.exportRow}>
            <Button
              label="Export PDF"
              icon="document-text-outline"
              variant="danger"
              block
              loading={busy === 'pdf'}
              disabled={busy != null}
              onPress={() => handleExport('pdf')}
            />
            <Button
              label="Export Excel"
              icon="grid-outline"
              variant="success"
              block
              loading={busy === 'csv'}
              disabled={busy != null}
              onPress={() => handleExport('csv')}
            />
          </View>
          <T variant="caption" tone="muted" style={styles.exportHint}>
            Excel exports as a CSV file that opens in Excel, Google Sheets and Numbers.
          </T>
        </View>
      </ScreenScroll>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  statsCard: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  list: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radius.lg,
  },
  exportBlock: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
  exportLabel: {
    marginBottom: spacing.sm,
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exportHint: {
    marginTop: spacing.sm,
  },
}));
