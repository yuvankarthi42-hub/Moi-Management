import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { ReportRow } from '../../src/components/app/ReportRow';
import { ReportShell } from '../../src/components/app/ReportShell';
import { Card, EmptyState, T } from '../../src/components/ui';
import { buildTopContributors } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, radius } from '../../src/theme';

/** Medal colours for the top three; everyone else gets the plain badge. */
const MEDALS = ['🥇', '🥈', '🥉'];

export default function TopContributorsScreen() {
  const styles = useStyles();
  const { data } = useAppData();
  const router = useRouter();

  return (
    <ReportShell
      title="Top Contributors"
      subtitle="People who contributed the most"
      kind="top-contributors"
      data={data}
    >
      {(range) => {
        const rows = buildTopContributors(data, 50, range);

        if (rows.length === 0) {
          return (
            <Card>
              <EmptyState
                icon="trophy-outline"
                title="Nothing to rank yet"
                message="Record some moi and the top givers will appear here."
              />
            </Card>
          );
        }

        return (
          <Card padded={false}>
            {rows.map((row, index) => (
              <Pressable
                key={row.id}
                onPress={() => router.push(`/person/${row.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${row.name}, rank ${row.rank}`}
              >
                <ReportRow
                  leading={
                    row.rank <= 3 ? (
                      <T style={styles.medal} allowFontScaling={false}>
                        {MEDALS[row.rank - 1]}
                      </T>
                    ) : (
                      <View style={styles.rank}>
                        <T variant="smallStrong" tone="secondary">
                          {row.rank}
                        </T>
                      </View>
                    )
                  }
                  title={row.name}
                  subtitle={`${row.village ?? 'No village'} · ${(row.share * 100).toFixed(1)}% of all moi`}
                  amount={row.total}
                  flow="out"
                  share={row.share}
                  last={index === rows.length - 1}
                />
              </Pressable>
            ))}
          </Card>
        );
      }}
    </ReportShell>
  );
}

const useStyles = makeStyles((colors) => ({
  medal: {
    fontSize: 22,
    lineHeight: 28,
  },
  rank: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
