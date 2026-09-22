import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Dataset } from '../../domain/models';
import { type DateRange } from '../../domain/selectors';
import { exportReport, type ExportFormat, type ReportKind } from '../../services/exportService';
import { makeStyles, spacing } from '../../theme';
import { AppHeader } from '../ui/AppHeader';
import { Button } from '../ui/Button';
import { PickerField } from '../ui/Field';
import { Screen, ScreenScroll } from '../ui/Screen';
import { OptionPicker } from './OptionPicker';

/** Range presets. `all` clears the filter entirely. */
type RangeKey = 'all' | 'this-year' | 'last-year' | 'last-6-months' | 'last-30-days';

const RANGE_LABELS: Record<RangeKey, string> = {
  all: 'All time',
  'this-year': 'This year',
  'last-year': 'Last year',
  'last-6-months': 'Last 6 months',
  'last-30-days': 'Last 30 days',
};

function resolveRange(key: RangeKey, now = new Date()): DateRange | undefined {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const year = now.getFullYear();
  switch (key) {
    case 'this-year':
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    case 'last-year':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case 'last-6-months': {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 6);
      return { from: iso(from), to: iso(now) };
    }
    case 'last-30-days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: iso(from), to: iso(now) };
    }
    case 'all':
    default:
      return undefined;
  }
}

/**
 * Shared chrome for every report: header, period filter and the two export
 * buttons. The individual report screens supply only their body, via a render
 * prop that receives the resolved date range.
 */
export function ReportShell({
  title,
  subtitle,
  kind,
  data,
  children,
  showRangeFilter = true,
}: {
  title: string;
  subtitle?: string;
  kind: ReportKind;
  data: Dataset;
  children: (range: DateRange | undefined) => React.ReactNode;
  showRangeFilter?: boolean;
}) {
  const styles = useStyles();
  const [rangeKey, setRangeKey] = useState<RangeKey>('all');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | undefined>();

  const range = useMemo(() => resolveRange(rangeKey), [rangeKey]);

  const handleExport = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await exportReport({ kind, data, format, range });
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <Screen>
      <AppHeader title={title} subtitle={subtitle} showBack />

      <ScreenScroll extraBottomSpace={8}>
        {showRangeFilter ? (
          <View style={styles.filter}>
            <PickerField
              value={RANGE_LABELS[rangeKey]}
              placeholder="Choose period"
              leftIcon="calendar-outline"
              onPress={() => setRangeOpen(true)}
              containerStyle={styles.filterField}
            />
          </View>
        ) : null}

        <View style={styles.body}>{children(range)}</View>

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
      </ScreenScroll>

      <OptionPicker
        visible={rangeOpen}
        onClose={() => setRangeOpen(false)}
        title="Period"
        selected={rangeKey}
        options={(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => ({
          value: key,
          label: RANGE_LABELS[key],
        }))}
        onSelect={(key) => {
          setRangeKey(key);
          setRangeOpen(false);
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  filter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  filterField: {
    marginBottom: 0,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
  },
}));
