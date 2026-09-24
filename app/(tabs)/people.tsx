import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';

import { PersonRow } from '../../src/components/app/PersonRow';
import { Button, ChipBar, EmptyState, HeaderCanvas, Screen, SearchBar, T, useListBottomPadding, useListContentStyle } from '../../src/components/ui';
import { matchesPerson, selectPeople, type PersonWithStats } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing } from '../../src/theme';
import { formatMoneyCompact } from '../../src/utils/format';

type Sort = 'name' | 'amount' | 'recent';

export default function PeopleScreen() {
  const styles = useStyles();
  const { data } = useAppData();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const listContentStyle = useListContentStyle();
  const bottomPadding = useListBottomPadding(true);

  const people = useMemo(() => selectPeople(data), [data]);

  const visible = useMemo(() => {
    const filtered = people.filter(
      (p) => matchesPerson(p, query),
    );
    const sorted = [...filtered];
    if (sort === 'amount') sorted.sort((a, b) => b.totalReceived - a.totalReceived);
    else if (sort === 'recent') {
      sorted.sort((a, b) => (b.lastDate ?? '').localeCompare(a.lastDate ?? ''));
    }
    return sorted;
  }, [people, query, sort]);

  const totalShown = useMemo(
    () => visible.reduce((sum, p) => sum + p.totalReceived, 0),
    [visible],
  );

  const renderItem = ({ item }: { item: PersonWithStats }) => (
    <PersonRow person={item} onPress={() => router.push(`/person/${item.id}`)} />
  );

  return (
    <Screen>
      <HeaderCanvas>
        <View style={styles.titleRow}>
          <T variant="h2" tone="onPrimary" style={styles.title}>
            People
          </T>
          <Button
            label="Add Person"
            icon="person-add"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/person/new')}
          />
        </View>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, phone or village"
          onDark
          style={styles.search}
        />
      </HeaderCanvas>

      <ChipBar<Sort>
        options={[
          { value: 'name', label: 'A–Z' },
          { value: 'amount', label: 'Highest given' },
          { value: 'recent', label: 'Most recent' },
        ]}
        value={sort}
        onChange={setSort}
        style={styles.chips}
      />

      <View style={styles.summary}>
        <T variant="caption" tone="muted">
          {visible.length} {visible.length === 1 ? 'person' : 'people'}
        </T>
        <T variant="captionStrong" tone="secondary">
          {formatMoneyCompact(totalShown)} received in total
        </T>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, listContentStyle, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={query ? 'No matching people' : 'No people yet'}
            message={
              query
                ? 'Try a different name, phone or village.'
                : 'Add the guests you invite so their moi history builds up over time.'
            }
            actionLabel={query ? undefined : 'Add Person'}
            onAction={query ? undefined : () => router.push('/person/new')}
          />
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
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
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.lg,
    flexGrow: 1,
  },
}));
