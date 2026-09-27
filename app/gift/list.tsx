import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView } from 'react-native';

import { GiftRow } from '../../src/components/app/GiftRow';
import { OptionPicker } from '../../src/components/app/OptionPicker';
import {
  AppHeader, Card, DropdownChip, EmptyState, Screen, SearchBar, StatRow, T,
  useListBottomPadding, useListContentStyle,
} from '../../src/components/ui';
import { functionTypeMeta } from '../../src/domain/functionTypes';
import { matchesPerson, selectFunctions, type GiftView } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing } from '../../src/theme';
import { formatDate } from '../../src/utils/date';
import { formatCount, formatMoneyCompact } from '../../src/utils/format';

type Sort = 'recent' | 'highest' | 'name';

const SORT_LABELS: Record<Sort, string> = {
  recent: 'Most recent',
  highest: 'Highest value',
  name: 'A–Z',
};

/**
 * Every gift across every function — the mirror of All Moi Entries.
 *
 * Sorted by value rather than by amount, and with no payment filter: a gift
 * has no payment type, and most have no value either.
 */
export default function GiftListScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { data } = useAppData();

  const [query, setQuery] = useState('');
  const [functionId, setFunctionId] = useState<string>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [functionOpen, setFunctionOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const listContentStyle = useListContentStyle();
  const bottomPadding = useListBottomPadding(false);

  const functions = useMemo(() => selectFunctions(data), [data]);

  const gifts = useMemo<GiftView[]>(() => {
    const peopleById = new Map(data.people.map((p) => [p.id, p]));
    const functionsById = new Map(data.functions.map((f) => [f.id, f]));

    let rows: GiftView[] = data.gifts.map((g) => ({
      ...g,
      person: peopleById.get(g.personId),
      functionTitle: functionsById.get(g.functionId)?.title,
    }));

    if (functionId !== 'all') rows = rows.filter((g) => g.functionId === functionId);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.person ? matchesPerson(g.person, query) : false) ||
          (g.functionTitle ?? '').toLowerCase().includes(q),
      );
    }

    const sorted = [...rows];
    // Unpriced gifts sort last by value rather than as zero: they are not
    // worth nothing, the household simply never said.
    if (sort === 'highest') sorted.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

    return sorted;
  }, [data, functionId, query, sort]);

  const valued = useMemo(
    () => gifts.reduce((total, g) => total + (g.value ?? 0), 0),
    [gifts],
  );
  const unpriced = useMemo(() => gifts.filter((g) => !g.value).length, [gifts]);

  const selectedFunction = functions.find((f) => f.id === functionId);
  const filtered = functionId !== 'all' || sort !== 'recent';

  const clearFilters = () => {
    setFunctionId('all');
    setSort('recent');
  };

  return (
    <Screen>
      <AppHeader
        title="All Gifts"
        subtitle={selectedFunction ? selectedFunction.title : 'Across every function'}
        showBack
      >
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search gift, person or function"
          onDark
        />
      </AppHeader>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filters}
      >
        <DropdownChip
          label={selectedFunction ? selectedFunction.title : 'Function'}
          active={functionId !== 'all'}
          onPress={() => setFunctionOpen(true)}
          accessibilityLabel={`Filter by function, ${
            selectedFunction ? selectedFunction.title : 'all functions'
          }`}
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

      <FlatList
        data={gifts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GiftRow
            gift={item}
            showPerson
            onPress={() => router.push(`/function/${item.functionId}`)}
          />
        )}
        contentContainerStyle={[styles.list, listContentStyle, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Card style={styles.summary}>
            <StatRow
              compactLabels
              items={[
                { label: 'Gifts', value: formatCount(gifts.length), tone: 'warning' },
                {
                  label: 'Valued at',
                  value: valued ? formatMoneyCompact(valued) : '—',
                },
                { label: 'Not priced', value: formatCount(unpriced) },
              ]}
            />
          </Card>
        }
        ListEmptyComponent={
          <EmptyState
            icon="gift-outline"
            title="No gifts match"
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

const useStyles = makeStyles(() => ({
  filterBar: {
    // As on the moi list: a sibling list is flexGrow 1 / flexBasis 0, and the
    // default flexShrink would let flexbox squeeze this row to nothing.
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
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexGrow: 1,
  },
}));
