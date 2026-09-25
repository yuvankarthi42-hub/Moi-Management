import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { AppHeader, Card, ListRow, RowDivider, Screen, ScreenScroll, StatRow } from '../../src/components/ui';
import { selectOverview } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, radius, spacing } from '../../src/theme';
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

  const overview = useMemo(() => selectOverview(data), [data]);

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
}));
