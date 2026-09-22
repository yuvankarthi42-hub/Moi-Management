import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ReportShell } from '../../src/components/app/ReportShell';
import { Card, EmptyState, StatRow, T } from '../../src/components/ui';
import { buildGuestReport } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, radius, spacing, useColors } from '../../src/theme';
import { formatDate } from '../../src/utils/date';
import { formatCount } from '../../src/utils/format';

/** Invited / accepted / attended, per function (spec §15). */
export default function GuestReportScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { data } = useAppData();
  const router = useRouter();

  return (
    <ReportShell
      title="Guest Report"
      subtitle="Invited, accepted and attended"
      kind="guest"
      data={data}
    >
      {(range) => {
        const report = buildGuestReport(data, range);

        if (report.rows.length === 0) {
          return (
            <Card>
              <EmptyState
                icon="people-circle-outline"
                title="No guest lists yet"
                message="Build a guest list on a function to track RSVPs and attendance."
              />
            </Card>
          );
        }

        return (
          <>
            <Card style={styles.statsCard} elevation={2}>
              <StatRow
                compactLabels
                items={[
                  { label: 'Invited', value: formatCount(report.totals.total) },
                  {
                    label: 'Accepted',
                    value: formatCount(report.totals.accepted),
                    tone: 'success',
                  },
                  { label: 'Pending', value: formatCount(report.totals.pending) },
                  {
                    label: 'Attended',
                    value: formatCount(report.totals.checkedIn),
                    tone: 'primary',
                  },
                ]}
              />
            </Card>

            {report.rows.map((row) => {
              const acceptShare = row.invited ? row.accepted / row.invited : 0;
              const attendShare = row.invited ? row.checkedIn / row.invited : 0;
              return (
                <Pressable
                  key={row.functionId}
                  onPress={() => router.push(`/function/${row.functionId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={row.title}
                >
                  <Card style={styles.row}>
                    <View style={styles.rowHeader}>
                      <View style={styles.rowTitle}>
                        <T variant="bodyStrong" numberOfLines={1}>
                          {row.title}
                        </T>
                        <T variant="caption" tone="muted">
                          {formatDate(row.date)}
                        </T>
                      </View>
                      <T variant="h3">{row.invited}</T>
                    </View>

                    {/* Two stacked bars: how many said yes, and how many came. */}
                    <Bar label="Accepted" share={acceptShare} value={row.accepted} tint={colors.success} />
                    <Bar label="Attended" share={attendShare} value={row.checkedIn} tint={colors.primary} />

                    <View style={styles.breakdown}>
                      <Pill label={`${row.pending} pending`} />
                      <Pill label={`${row.maybe} maybe`} />
                      <Pill label={`${row.declined} declined`} />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </>
        );
      }}
    </ReportShell>
  );
}

function Bar({
  label,
  share,
  value,
  tint,
}: {
  label: string;
  share: number;
  value: number;
  tint: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.bar}>
      <View style={styles.barHeader}>
        <T variant="caption" tone="muted">
          {label}
        </T>
        <T variant="captionStrong" tone="secondary">
          {value} · {(share * 100).toFixed(0)}%
        </T>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(share * 100, value > 0 ? 2 : 0)}%`, backgroundColor: tint },
          ]}
        />
      </View>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.pill}>
      <T variant="caption" tone="muted">
        {label}
      </T>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  statsCard: {
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  row: {
    marginBottom: spacing.md,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  rowTitle: {
    flex: 1,
  },
  bar: {
    marginBottom: spacing.sm,
  },
  barHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  breakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
}));
