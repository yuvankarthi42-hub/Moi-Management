import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { GroupReportRow } from '../../domain/selectors';
import { colors, makeStyles, radius, spacing, useColors } from '../../theme';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { T } from '../ui/Text';
import { HeroTotal } from './HeroTotal';
import { ReportRow } from './ReportRow';

/** Shared body for the village and family reports — identical shape, different grouping. */
export function GroupReportBody({
  rows,
  emptyTitle,
  emptyMessage,
  unitSingular,
  unitPlural,
}: {
  rows: GroupReportRow[];
  emptyTitle: string;
  emptyMessage: string;
  unitSingular: string;
  unitPlural: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState icon="location-outline" title={emptyTitle} message={emptyMessage} />
      </Card>
    );
  }

  const total = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <>
      <HeroTotal
        label={`Total across ${rows.length} ${rows.length === 1 ? unitSingular : unitPlural}`}
        value={`₹${total.toLocaleString('en-IN')}`}
      />

      <Card padded={false} style={styles.list}>
        {rows.map((row, index) => (
          <ReportRow
            key={row.key}
            leading={
              <View style={styles.rank}>
                <T variant="smallStrong" tone="primary">
                  {index + 1}
                </T>
              </View>
            }
            title={row.label}
            subtitle={`${row.peopleCount} ${row.peopleCount === 1 ? 'person' : 'people'} · ${
              row.entryCount
            } ${row.entryCount === 1 ? 'entry' : 'entries'}`}
            amount={row.total}
            share={total ? row.total / total : 0}
            last={index === rows.length - 1}
          />
        ))}
      </Card>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  list: {
    marginTop: spacing.md,
  },
  rank: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
