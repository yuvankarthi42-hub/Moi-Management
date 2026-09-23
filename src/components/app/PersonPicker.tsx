import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import type { ID } from '../../domain/models';
import { matchesPerson, selectPeople, type PersonWithStats } from '../../domain/selectors';
import { useAppData } from '../../store/AppDataProvider';
import { colors, makeStyles, spacing, useColors } from '../../theme';
import { formatMoney, formatPhone } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { SearchBar } from '../ui/SearchBar';
import { Sheet } from '../ui/Sheet';
import { T } from '../ui/Text';

/**
 * Searchable person chooser.
 *
 * Shows each person's running total, which is the number the host actually
 * needs when deciding what to write down — and offers "Add new person" inline
 * so an unknown guest never interrupts the flow at the moi table.
 */
export function PersonPicker({
  visible,
  onClose,
  onSelect,
  onCreateNew,
  title = 'Choose person',
  excludeIds,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (personId: ID) => void;
  onCreateNew?: (prefillName: string) => void;
  title?: string;
  excludeIds?: ID[];
}) {
  const styles = useStyles();
  const colors = useColors();
  const { data } = useAppData();
  const [query, setQuery] = useState('');

  const people = useMemo(() => {
    const excluded = new Set(excludeIds ?? []);
    return selectPeople(data).filter((p) => !excluded.has(p.id) && matchesPerson(p, query));
  }, [data, query, excludeIds]);

  const handleSelect = (id: ID) => {
    setQuery('');
    onSelect(id);
  };

  const renderItem = ({ item }: { item: PersonWithStats }) => (
    <Pressable
      onPress={() => handleSelect(item.id)}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      android_ripple={{ color: colors.primarySoft }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Avatar name={item.name} uri={item.photoUri} seed={item.id} size={40} />
      <View style={styles.rowBody}>
        <T variant="body" numberOfLines={1}>
          {item.name}
        </T>
        <T variant="caption" tone="muted" numberOfLines={1}>
          {[item.village, item.phone ? formatPhone(item.phone) : undefined]
            .filter(Boolean)
            .join(' · ') || 'No details yet'}
        </T>
      </View>
      {item.totalReceived > 0 ? (
        <T variant="captionStrong" tone="secondary">
          {formatMoney(item.totalReceived)}
        </T>
      ) : null}
    </Pressable>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        onCreateNew ? (
          <Button
            label={query.trim() ? `Add “${query.trim()}” as new person` : 'Add new person'}
            icon="person-add-outline"
            variant="secondary"
            block
            onPress={() => {
              const prefill = query.trim();
              setQuery('');
              onCreateNew(prefill);
            }}
          />
        ) : undefined
      }
    >
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, phone or village"
        />
      </View>

      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="person-outline"
            title="No one found"
            message={
              query
                ? 'Nobody matches that search. Add them as a new person.'
                : 'Your contact book is empty.'
            }
          />
        }
      />
    </Sheet>
  );
}

const useStyles = makeStyles((colors) => ({
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowBody: {
    flex: 1,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
}));
