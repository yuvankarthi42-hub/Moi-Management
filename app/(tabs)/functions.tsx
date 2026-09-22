import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { FunctionCard } from '../../src/components/app/FunctionCard';
import {
  Button, ChipBar, EmptyState, HeaderCanvas, Screen, SearchBar, T, useListBottomPadding,
} from '../../src/components/ui';
import { matchesFunction, selectFunctions, type FunctionWithStats } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { spacing } from '../../src/theme';

type Filter = 'all' | 'upcoming' | 'completed';

export default function FunctionsScreen() {
  const { data } = useAppData();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const bottomPadding = useListBottomPadding(true);

  const all = useMemo(() => selectFunctions(data), [data]);

  const counts = useMemo(
    () => ({
      all: all.length,
      upcoming: all.filter((f) => f.status === 'upcoming').length,
      completed: all.filter((f) => f.status === 'completed').length,
    }),
    [all],
  );

  const visible = useMemo(() => {
    const byStatus =
      filter === 'all' ? all : all.filter((f) => f.status === filter);
    // Upcoming reads best soonest-first; history reads best newest-first.
    const ordered =
      filter === 'upcoming'
        ? [...byStatus].sort((a, b) => a.date.localeCompare(b.date))
        : byStatus;
    return ordered.filter((f) => matchesFunction(f, query));
  }, [all, filter, query]);

  const renderItem = ({ item }: { item: FunctionWithStats }) => (
    <FunctionCard
      fn={item}
      onPress={() => router.push(`/function/${item.id}`)}
      showCountdown={item.status === 'upcoming'}
    />
  );

  return (
    <Screen>
      <HeaderCanvas>
        <View style={styles.titleRow}>
          <T variant="h2" tone="onPrimary" style={styles.title}>
            Functions
          </T>
          <Button
            label="Add Function"
            icon="add"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/function/new')}
          />
        </View>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, venue or village"
          onDark
          style={styles.search}
        />
      </HeaderCanvas>

      <ChipBar<Filter>
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
          { value: 'completed', label: 'Completed', count: counts.completed },
        ]}
        value={filter}
        onChange={setFilter}
        style={styles.chips}
      />

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={query ? 'No matching functions' : 'No functions yet'}
            message={
              query
                ? 'Try a different name, venue or village.'
                : 'Add your first function to start recording moi.'
            }
            actionLabel={query ? undefined : 'Add Function'}
            onAction={query ? undefined : () => router.push('/function/new')}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    marginRight: spacing.md,
  },
  search: {
    marginTop: spacing.lg,
  },
  chips: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
});
