import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { FunctionCard, UpcomingFunctionCard } from '../../src/components/app/FunctionCard';
import { MoiEntryRow } from '../../src/components/app/PersonRow';
import { Avatar, Card, EmptyState, HeaderCanvas, Screen, ScreenScroll, SectionHeader, StatRow, StatusBarScrim, T } from '../../src/components/ui';
import { selectFunctions, selectNextFunction, selectOverview, selectRecentMoi } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../../src/theme';
import { greeting } from '../../src/utils/date';
import { formatCount, formatMoneyCompact } from '../../src/utils/format';

const RECENT_LIMIT = 3;

export default function HomeScreen() {
  const styles = useStyles();
  const colors = useColors();
  const { data, loading, refresh } = useAppData();
  const router = useRouter();

  const overview = useMemo(() => selectOverview(data), [data]);
  const next = useMemo(() => selectNextFunction(data), [data]);
  const recent = useMemo(
    () => selectFunctions(data).filter((f) => f.status === 'completed').slice(0, RECENT_LIMIT),
    [data],
  );
  const recentMoi = useMemo(() => selectRecentMoi(data, 4), [data]);

  return (
    <Screen>
      <StatusBarScrim />

      {/* Fixed, like the other tabs: the greeting and the way through to
          search and settings stay reachable however far down you have read.
          No bleed — the stats card used to overlap the gradient, but the
          scroll paints over this header, so an overlapping card would ride up
          across it. */}
      <HeaderCanvas>
        <View style={styles.greetRow}>
          <View style={styles.greetText}>
            <T variant="small" color={colors.onPrimaryMuted}>
              {greeting()},
            </T>
            <T variant="h1" tone="onPrimary" numberOfLines={1}>
              {data.profile.name || 'Welcome'} 👋
            </T>
          </View>
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel="Search everything"
            hitSlop={10}
            style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
          >
            <Ionicons name="search" size={20} color={colors.onPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Avatar
              name={data.profile.name || 'Me'}
              uri={data.profile.photoUri}
              seed={data.profile.id}
              size={44}
              style={styles.profileAvatar}
            />
          </Pressable>
        </View>
      </HeaderCanvas>

      <ScreenScroll
        withTabBar
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        <Card style={styles.statsCard} elevation={2}>
          <StatRow
            compactLabels
            items={[
              { label: 'Functions', value: formatCount(overview.functionCount) },
              { label: 'Moi', value: formatMoneyCompact(overview.totalMoi), tone: 'success' },
              { label: 'People', value: formatCount(overview.peopleCount) },
              { label: 'Expenses', value: formatMoneyCompact(overview.totalExpenses), tone: 'danger' },
            ]}
          />

          <View style={styles.balanceRow}>
            <T variant="small" tone="secondary">
              Balance after expenses
            </T>
            <T variant="bodyStrong" tone={overview.balance >= 0 ? 'success' : 'danger'}>
              {formatMoneyCompact(overview.balance)}
            </T>
          </View>
        </Card>

        {next ? (
          <>
            <SectionHeader title="Upcoming Function" />
            <UpcomingFunctionCard fn={next} onPress={() => router.push(`/function/${next.id}`)} />
          </>
        ) : (
          <>
            <SectionHeader title="Upcoming Function" />
            <Card style={styles.sideMargin}>
              <EmptyState
                icon="calendar-outline"
                title="No function planned"
                message="Add your next function to start collecting moi."
                actionLabel="Add Function"
                onAction={() => router.push('/function/new')}
              />
            </Card>
          </>
        )}

        {recentMoi.length > 0 ? (
          <>
            <SectionHeader
              title="Recent Moi"
              actionLabel="View All"
              onAction={() => router.push('/moi/list')}
            />
            <View style={styles.sideMargin}>
              {recentMoi.map((entry) => (
                <MoiEntryRow
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push(`/function/${entry.functionId}`)}
                />
              ))}
            </View>
          </>
        ) : null}

        <SectionHeader
          title="Recent Functions"
          actionLabel={recent.length ? 'View All' : undefined}
          onAction={() => router.push('/(tabs)/functions')}
        />
        <View style={styles.sideMargin}>
          {recent.length > 0 ? (
            recent.map((fn) => (
              <FunctionCard key={fn.id} fn={fn} onPress={() => router.push(`/function/${fn.id}`)} />
            ))
          ) : (
            <Card>
              <EmptyState
                icon="time-outline"
                title="No completed functions yet"
                message="Functions move here once their date has passed."
              />
            </Card>
          )}
        </View>
      </ScreenScroll>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetText: {
    flex: 1,
    marginRight: spacing.md,
  },
  profileAvatar: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  sideMargin: {
    marginHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.8,
  },
}));
