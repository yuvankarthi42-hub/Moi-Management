import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ReportRow } from '../../src/components/app/ReportRow';
import { ReportShell } from '../../src/components/app/ReportShell';
import { Avatar, Card, EmptyState, SearchBar, T } from '../../src/components/ui';
import { buildPersonReport } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing } from '../../src/theme';
import { formatMoney } from '../../src/utils/format';

export default function PersonReportScreen() {
  const styles = useStyles();
  const { data } = useAppData();
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <ReportShell title="Person Report" subtitle="How much each person gave" kind="person" data={data}>
      {(range) => {
        const all = buildPersonReport(data, range);
        const q = query.trim().toLowerCase();
        const rows = q
          ? all.filter(
              (r) =>
                r.name.toLowerCase().includes(q) ||
                (r.village ?? '').toLowerCase().includes(q),
            )
          : all;
        const total = rows.reduce((sum, r) => sum + r.total, 0);

        return (
          <>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search person or village"
            />

            <View style={styles.summary}>
              <T variant="caption" tone="muted">
                {rows.length} {rows.length === 1 ? 'person' : 'people'}
              </T>
              <T variant="captionStrong" tone="secondary">
                {formatMoney(total)} total
              </T>
            </View>

            {rows.length === 0 ? (
              <Card>
                <EmptyState
                  icon="person-outline"
                  title="Nobody to show"
                  message={query ? 'Try a different search.' : 'No moi recorded in this period.'}
                />
              </Card>
            ) : (
              <Card padded={false}>
                {rows.map((row, index) => (
                  <Pressable
                    key={row.id}
                    onPress={() => router.push(`/person/${row.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={row.name}
                  >
                    <ReportRow
                      leading={<Avatar name={row.name} seed={row.id} size={34} />}
                      title={row.name}
                      subtitle={`${row.village ?? 'No village'} · ${row.functionCount} ${
                        row.functionCount === 1 ? 'function' : 'functions'
                      }`}
                      amount={row.total}
                      flow="in"
                      share={total ? row.total / total : 0}
                      last={index === rows.length - 1}
                    />
                  </Pressable>
                ))}
              </Card>
            )}
          </>
        );
      }}
    </ReportShell>
  );
}

const useStyles = makeStyles((colors) => ({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
}));
