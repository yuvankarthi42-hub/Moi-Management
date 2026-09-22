import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { MoiEntryRow } from '../../src/components/app/PersonRow';
import {
  AppHeader, Card, ChipBar, EmptyState, Screen, SearchBar, StatRow, T, useListBottomPadding,
} from '../../src/components/ui';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import type { PaymentType } from '../../src/domain/models';
import {
  matchesPerson, selectFunctions, splitByPaymentType, type MoiEntryView,
} from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, spacing } from '../../src/theme';
import { formatDate } from '../../src/utils/date';
import { formatCount, formatMoneyCompact } from '../../src/utils/format';

type Sort = 'recent' | 'highest' | 'lowest' | 'name';

/** Every moi entry across every function, with the filters from spec §9. */
export default function MoiListScreen() {
  const router = useRouter();
  const { data } = useAppData();

  const [query, setQuery] = useState('');
  const [functionId, setFunctionId] = useState<string>('all');
  const [payment, setPayment] = useState<PaymentType | 'all'>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [functionOpen, setFunctionOpen] = useState(false);
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

  return (
    <Screen>
      <AppHeader
        title="All Moi Entries"
        subtitle={selectedFunction ? selectedFunction.title : 'Across every function'}
        showBack
        actions={[
          {
            icon: 'funnel-outline',
            onPress: () => setFunctionOpen(true),
            accessibilityLabel: 'Filter by function',
          },
        ]}
      >
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search person, amount or function"
          onDark
        />
      </AppHeader>

      <ChipBar<PaymentType | 'all'>
        options={[
          { value: 'all', label: 'All payments' },
          { value: 'cash', label: 'Cash' },
          { value: 'upi', label: 'UPI' },
          { value: 'other', label: 'Other' },
        ]}
        value={payment}
        onChange={setPayment}
        style={styles.chips}
      />

      <ChipBar<Sort>
        options={[
          { value: 'recent', label: 'Most recent' },
          { value: 'highest', label: 'Highest' },
          { value: 'lowest', label: 'Lowest' },
          { value: 'name', label: 'A–Z' },
        ]}
        value={sort}
        onChange={setSort}
      />

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
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    marginTop: spacing.md,
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
});
