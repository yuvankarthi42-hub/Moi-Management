import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppHeader, Card, EmptyState, Money, Screen, ScreenScroll, SearchBar, T } from '../src/components/ui';
import { searchAll, type SearchResult, type SearchResultKind } from '../src/domain/selectors';
import { useAppData } from '../src/store/AppDataProvider';
import { makeStyles, radius, spacing, useColors } from '../src/theme';

const GROUPS: Array<{
  kind: SearchResultKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}> = [
  { kind: 'function', label: 'Functions', icon: 'calendar-outline', tint: '#E8912A' },
  { kind: 'person', label: 'People', icon: 'person-outline', tint: '#2563EB' },
  { kind: 'moi', label: 'Moi entries', icon: 'cash-outline', tint: '#0FA968' },
];

/**
 * One search box across every record type (spec §17).
 *
 * Results are grouped by kind rather than interleaved, so a search for a name
 * shows the person and their moi entries as separate answers instead of a
 * single ambiguous list.
 */
export default function SearchScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { data } = useAppData();
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchAll(data, query), [data, query]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultKind, SearchResult[]>();
    for (const result of results) {
      const list = map.get(result.kind);
      if (list) list.push(result);
      else map.set(result.kind, [result]);
    }
    return map;
  }, [results]);

  const trimmed = query.trim();

  return (
    <Screen>
      <AppHeader title="Search" showBack>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search functions, people or moi"
          autoFocus
          onDark
        />
      </AppHeader>

      <ScreenScroll contentStyle={styles.content}>
        {trimmed.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Search everything"
            message="Find a function, a person or a moi entry — type a name, a village or an amount."
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon="sad-outline"
            title={`Nothing found for “${trimmed}”`}
            message="Try a shorter search, or check the spelling."
          />
        ) : (
          GROUPS.map((group) => {
            const rows = grouped.get(group.kind);
            if (!rows?.length) return null;
            return (
              <View key={group.kind} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Ionicons name={group.icon} size={15} color={group.tint} />
                  <T variant="captionStrong" tone="muted">
                    {group.label.toUpperCase()} ({rows.length})
                  </T>
                </View>

                <Card padded={false}>
                  {rows.map((result, index) => (
                    <Pressable
                      key={`${result.kind}-${result.id}`}
                      onPress={() => router.push(result.href as never)}
                      accessibilityRole="button"
                      accessibilityLabel={result.title}
                      android_ripple={{ color: colors.primarySoft }}
                      style={({ pressed }) => [
                        styles.row,
                        index > 0 && styles.rowDivider,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.rowIcon, { backgroundColor: `${group.tint}18` }]}>
                        <Ionicons name={group.icon} size={16} color={group.tint} />
                      </View>
                      <View style={styles.rowBody}>
                        <T variant="body" numberOfLines={1}>
                          {result.title}
                        </T>
                        <T variant="caption" tone="muted" numberOfLines={1}>
                          {result.subtitle}
                        </T>
                      </View>
                      {result.amount != null ? (
                        <Money value={result.amount} flow="in" variant="smallStrong" />
                      ) : null}
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </Card>
              </View>
            );
          })
        )}
      </ScreenScroll>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  content: {
    paddingTop: spacing.lg,
  },
  group: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
  pressed: {
    backgroundColor: colors.surfaceAlt,
  },
}));
