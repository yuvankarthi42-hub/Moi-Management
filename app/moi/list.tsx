import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { MoiEntryRow } from '../../src/components/app/PersonRow';
import { AppHeader, Card, DropdownChip, EmptyState, Screen, SearchBar, StatRow, T, useListBottomPadding, useListContentStyle } from '../../src/components/ui';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import type { PaymentType } from '../../src/domain/models';
import { matchesPerson, selectFunctions, splitByPaymentType, type MoiEntryView } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing } from '../../src/theme';
import { formatDate } from '../../src/utils/date';
import { formatCount, formatMoneyCompact } from '../../src/utils/format';

type Sort = 'recent' | 'highest' | 'lowest' | 'name';

/** Declared in the order they are offered in the picker. */
const PAYMENT_LABELS: Record<PaymentType | 'all', string> = {
  all: 'All payments',
  cash: 'Cash',
  upi: 'UPI',
  other: 'Other',
};

const SORT_LABELS: Record<Sort, string> = {
  recent: 'Most recent',
  highest: 'Highest',
  lowest: 'Lowest',
  name: 'A–Z',
};

/** Every moi entry across every function, with the filters from spec §9. */
export default function MoiListScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data } = useAppData();

  const [query, setQuery] = useState('');
  const [functionId, setFunctionId] = useState<string>('all');
  const [payment, setPayment] = useState<PaymentType | 'all'>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [functionOpen, setFunctionOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const listContentStyle = useListContentStyle();
  const bottomPadding = useListBottomPadding(false);

  const functions = useMemo(() => selectFunctions(data), [data]);

  const entries = useMemo<MoiEntryView[]>(() => {
    const peopleById = new Map(data.people.map((p) => [p.id, p]));
    const functionsById = new Map(data.functions.map((f) => [f.id, f]));

    let rows = data.moiEntries.map((e) => ({
      ...e,
      person: peopleById.get(e.personId),
      functionTitle: functionsById.get(e.functionId)?.title,
    }));

    if (functionId !== 'all') rows = rows.filter((e) => e.functionId === functionId);
    if (payment !== 'all') rows = rows.filter((e) => e.paymentType === payment);
    if (query.trim()) {
      rows = rows.filter(
        (e) =>
          (e.person ? matchesPerson(e.person, query) : false) ||
          String(e.amount).includes(query.trim()) ||
          (e.functionTitle ?? '').toLowerCase().includes(query.trim().toLowerCase()),
      );
    }

    const sorted = [...rows];
    if (sort === 'highest') sorted.sort((a, b) => b.amount - a.amount);
    else if (sort === 'lowest') sorted.sort((a, b) => a.amount - b.amount);
    else if (sort === 'name') {
      sorted.sort((a, b) => (a.person?.name ?? '').localeCompare(b.person?.name ?? ''));
    } else sorted.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

    return sorted;
  }, [data, functionId, payment, query, sort]);

  const split = useMemo(() => splitByPaymentType(entries), [entries]);
  const selectedFunction = functions.find((f) => f.id === functionId);
  const filtered = functionId !== 'all' || payment !== 'all' || sort !== 'recent';

  const clearFilters = () => {
    setFunctionId('all');
    setPayment('all');
    setSort('recent');
  };

  return (
    <Screen>
      <AppHeader
        title="All Moi Entries"
        subtitle={selectedFunction ? selectedFunction.title : 'Across every function'}
        showBack
      >
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search person, amount or function"
          onDark
        />
      </AppHeader>

      {/* One row for all three filters. Chip rows grew with the options — the
          function list is as long as the household has functions — while this
          stays one row however many there are. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filters}
      >
        {/* Idle chips name the dimension rather than the "all" value: it is
            shorter, all three fit one row, and it says what can be filtered
            rather than restating that nothing is. */}
        <DropdownChip
          label={selectedFunction ? selectedFunction.title : 'Function'}
          active={functionId !== 'all'}
          onPress={() => setFunctionOpen(true)}
          accessibilityLabel={`Filter by function, ${
            selectedFunction ? selectedFunction.title : 'all functions'
          }`}
        />
        <DropdownChip
          label={payment === 'all' ? 'Payment' : PAYMENT_LABELS[payment]}
          active={payment !== 'all'}
          onPress={() => setPaymentOpen(true)}
          accessibilityLabel={`Filter by payment type, ${PAYMENT_LABELS[payment]}`}
        />
        <DropdownChip
          label={sort === 'recent' ? 'Sort' : SORT_LABELS[sort]}
          active={sort !== 'recent'}
          onPress={() => setSortOpen(true)}
          accessibilityLabel={`Sort, ${SORT_LABELS[sort]}`}
        />
        {filtered ? (
          <Pressable
            onPress={clearFilters}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
          >
            <T variant="smallStrong" tone="primary">
              Clear
            </T>
          </Pressable>
        ) : null}
      </ScrollView>

      <Card style={styles.summary}>
        <StatRow
          compactLabels
          items={[
            { label: 'Entries', value: formatCount(entries.length) },
            { label: 'Total', value: formatMoneyCompact(split.total), tone: 'success' },
            { label: 'Cash', value: formatMoneyCompact(split.cash) },
            { label: 'UPI', value: formatMoneyCompact(split.upi) },
          ]}
        />
      </Card>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MoiEntryRow
            entry={item}
            onPress={() => router.push(`/function/${item.functionId}`)}
          />
        )}
        contentContainerStyle={[styles.list, listContentStyle, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="cash-outline"
            title="No entries match"
            message="Try clearing the filters or searching for something else."
          />
        }
      />

      <OptionPicker
        visible={functionOpen}
        onClose={() => setFunctionOpen(false)}
        title="Filter by function"
        selected={functionId}
        options={[
          { value: 'all', label: 'All functions' },
          ...functions.map((f) => ({
            value: f.id,
            label: f.title,
            description: formatDate(f.date),
            emoji: functionTypeMeta(f.type).emoji,
          })),
        ]}
        onSelect={(value) => {
          setFunctionId(value);
          setFunctionOpen(false);
        }}
      />

      <OptionPicker
        visible={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="Payment type"
        selected={payment}
        options={(Object.keys(PAYMENT_LABELS) as Array<PaymentType | 'all'>).map((value) => ({
          value,
          label: PAYMENT_LABELS[value],
        }))}
        onSelect={(value) => {
          setPayment(value as PaymentType | 'all');
          setPaymentOpen(false);
        }}
      />

      <OptionPicker
        visible={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Sort by"
        selected={sort}
        options={(Object.keys(SORT_LABELS) as Sort[]).map((value) => ({
          value,
          label: SORT_LABELS[value],
        }))}
        onSelect={(value) => {
          setSort(value as Sort);
          setSortOpen(false);
        }}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  filterBar: {
    // Same reason as ChipBar: a sibling list is flexGrow 1 / flexBasis 0, and
    // the default flexShrink would let flexbox squeeze this row to nothing.
    flexGrow: 0,
    flexShrink: 0,
    marginTop: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  clear: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  clearPressed: {
    opacity: 0.5,
  },
  summary: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexGrow: 1,
  },
}));
