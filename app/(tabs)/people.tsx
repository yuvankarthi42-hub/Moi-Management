import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Linking, View } from 'react-native';

import { PersonRow } from '../../src/components/app/PersonRow';
import { Button, ChipBar, EmptyState, HeaderCanvas, ListRow, RowDivider, Screen, SearchBar, Sheet, T, useListBottomPadding, useListContentStyle, useToast } from '../../src/components/ui';
import { matchesPerson, selectPeople, type PersonWithStats } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../../src/theme';
import { confirmAction } from '../../src/utils/confirm';
import { formatMoneyCompact } from '../../src/utils/format';

type Sort = 'name' | 'amount' | 'recent';

export default function PeopleScreen() {
  const styles = useStyles();
  const { data, removePerson } = useAppData();
  const colors = useColors();
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  // The row that opened the action sheet. Held by id rather than by value so
  // the sheet follows an edit made while it is open.
  const [actionsFor, setActionsFor] = useState<string | undefined>();
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

  const selected = useMemo(
    () => people.find((p) => p.id === actionsFor),
    [people, actionsFor],
  );

  /** Runs after the sheet is out of the way, so the two animations do not overlap. */
  const thenClose = (run: () => void) => {
    setActionsFor(undefined);
    setTimeout(run, 180);
  };

  const openLink = async (scheme: 'tel' | 'sms', phone: string) => {
    const url = `${scheme}:${phone}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert('Not available', 'This device cannot open that app.');
  };

  const confirmDelete = async (person: PersonWithStats) => {
    setActionsFor(undefined);
    const ok = await confirmAction({
      title: 'Delete person?',
      message: `${person.name} and their moi history will be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    await removePerson(person.id);
    showToast({ message: `${person.name} deleted`, variant: 'destructive' });
  };

  const renderItem = ({ item }: { item: PersonWithStats }) => (
    <PersonRow
      person={item}
      onPress={() => router.push(`/person/${item.id}`)}
      onActions={() => setActionsFor(item.id)}
    />
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

      <Sheet
        visible={selected != null}
        onClose={() => setActionsFor(undefined)}
        title={selected?.name}
      >
        <View style={styles.sheet}>
          {selected?.phone ? (
            <>
              <ListRow
                icon="call-outline"
                iconTint={colors.success}
                title="Call"
                subtitle={selected.phone}
                showChevron={false}
                onPress={() => thenClose(() => openLink('tel', selected.phone!))}
              />
              <RowDivider />
              <ListRow
                icon="chatbubble-ellipses-outline"
                iconTint={colors.info}
                title="Message"
                showChevron={false}
                onPress={() => thenClose(() => openLink('sms', selected.phone!))}
              />
              <RowDivider />
            </>
          ) : null}

          <ListRow
            icon="arrow-down-circle-outline"
            iconTint={colors.success}
            title="Add received"
            subtitle="Record moi they gave you"
            showChevron={false}
            onPress={() => thenClose(() => router.push(`/moi/add?personId=${selected!.id}`))}
          />
          <RowDivider />
          <ListRow
            icon="arrow-up-circle-outline"
            title="Record given"
            subtitle="Moi you gave them"
            showChevron={false}
            onPress={() => thenClose(() => router.push(`/moi/given?personId=${selected!.id}`))}
          />
          <RowDivider />
          <ListRow
            icon="person-outline"
            title="View profile"
            subtitle="History, balance and what is still to return"
            showChevron={false}
            onPress={() => thenClose(() => router.push(`/person/${selected!.id}`))}
          />
          <RowDivider />
          <ListRow
            icon="create-outline"
            title="Edit"
            showChevron={false}
            onPress={() => thenClose(() => router.push(`/person/new?id=${selected!.id}`))}
          />
          <RowDivider />
          <ListRow
            icon="trash-outline"
            title="Delete"
            destructive
            showChevron={false}
            onPress={() => confirmDelete(selected!)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  sheet: {
    marginHorizontal: -spacing.lg,
  },
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
