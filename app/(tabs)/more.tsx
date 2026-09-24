import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { Avatar, Card, HeaderCanvas, ListRow, RowDivider, Screen, ScreenScroll, StatRow, StatusBarScrim, T } from '../../src/components/ui';
import type { LanguagePreference, ThemePreference } from '../../src/domain/models';
import { selectOverview } from '../../src/domain/selectors';

import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, radius, spacing, useColors } from '../../src/theme';
import { formatCount, formatMoneyCompact } from '../../src/utils/format';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const LANGUAGE_LABELS: Record<LanguagePreference, string> = {
  en: 'English',
  ta: 'தமிழ் (Tamil)',
};

/**
 * The fifth tab (spec §5).
 *
 * Reports, family and settings all live here rather than competing for a slot
 * in the bottom bar — the bar stays at four destinations plus the centre action.
 */
export default function MoreScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { data, saveSettings, repositories } = useAppData();
  const [themeOpen, setThemeOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  const overview = useMemo(() => selectOverview(data), [data]);
  const { profile, settings } = data;

  return (
    <Screen>
      <StatusBarScrim />
      <ScreenScroll withTabBar>
        <HeaderCanvas bleed={46}>
          <T variant="h2" tone="onPrimary">
            More
          </T>
          <T variant="small" color={colors.onPrimaryMuted} style={styles.subtitle}>
            Reports, family and settings
          </T>
        </HeaderCanvas>

        <Card
          style={styles.profileCard}
          elevation={2}
          onPress={() => router.push('/settings/profile')}
        >
          <View style={styles.profileRow}>
            <Avatar name={profile.name || 'Me'} uri={profile.photoUri} seed={profile.id} size={52} />
            <View style={styles.profileText}>
              <T variant="h3" numberOfLines={1}>
                {profile.name || 'Add your name'}
              </T>
              <T variant="caption" tone="muted" numberOfLines={1}>
                {profile.village ? `${profile.village} · ` : ''}View and edit your profile
              </T>
            </View>
          </View>

          <View style={styles.profileStats}>
            <StatRow
              compactLabels
              items={[
                { label: 'Functions', value: formatCount(overview.functionCount) },
                {
                  label: 'Collected',
                  value: formatMoneyCompact(overview.totalMoi),
                  tone: 'success',
                },
                { label: 'People', value: formatCount(overview.peopleCount) },
              ]}
            />
          </View>
        </Card>

        <Group title="Insights">
          <ListRow
            icon="bar-chart-outline"
            title="Reports"
            subtitle="Eight reports across moi, expenses and people"
            onPress={() => router.push('/reports')}
          />
          <RowDivider />
          <ListRow
            icon="search-outline"
            title="Search everything"
            subtitle="Functions, people and moi entries"
            onPress={() => router.push('/search')}
          />
          <RowDivider />
          <ListRow
            icon="list-outline"
            title="All Moi Entries"
            subtitle="Every entry, with filters"
            onPress={() => router.push('/moi/list')}
          />
        </Group>

        <Group title="Family">
          <ListRow
            icon="people-outline"
            title="Family Members"
            value={`${data.familyMembers.length}`}
            subtitle="Who can view and edit your records"
            onPress={() => router.push('/settings/members')}
          />
          <RowDivider />
          <ListRow
            icon="home-outline"
            title="Family Groups"
            value={`${data.families.length}`}
            subtitle="Group people for the family report"
            onPress={() => router.push('/settings/families')}
          />
        </Group>

        <Group title="App">
          <ListRow
            icon="color-palette-outline"
            title="Theme"
            value={THEME_LABELS[settings.theme]}
            onPress={() => setThemeOpen(true)}
          />
          <RowDivider />
          <ListRow
            icon="language-outline"
            title="Language"
            value={LANGUAGE_LABELS[settings.language]}
            onPress={() => setLanguageOpen(true)}
          />
          <RowDivider />
          <ListRow
            icon="settings-outline"
            title="App Settings"
            subtitle="Moi suggestions and notifications"
            onPress={() => router.push('/settings')}
          />
        </Group>

        <Group title="Data">
          <ListRow
            icon="cloud-download-outline"
            title="Backup & Restore"
            subtitle="Save or bring back every record"
            onPress={() => router.push('/settings/backup')}
          />
        </Group>

        <Group title="About">
          <ListRow
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() =>
              Alert.alert(
                'Help & Support',
                'Moi Manager keeps your family function records on this device. Use Backup & Restore to keep a copy safe before changing phones.',
              )
            }
          />
          <RowDivider />
          <ListRow
            icon="information-circle-outline"
            title="About Moi Manager"
            value="v1.0.0"
            showChevron={false}
          />
        </Group>

        <T variant="caption" tone="muted" center style={styles.footer}>
          Your records stay on this device.
        </T>
      </ScreenScroll>

      <OptionPicker
        visible={themeOpen}
        onClose={() => setThemeOpen(false)}
        title="Theme"
        selected={settings.theme}
        options={(Object.keys(THEME_LABELS) as ThemePreference[]).map((value) => ({
          value,
          label: THEME_LABELS[value],
        }))}
        onSelect={(theme) => {
          saveSettings({ theme });
          setThemeOpen(false);
        }}
      />

      <OptionPicker
        visible={languageOpen}
        onClose={() => setLanguageOpen(false)}
        title="Language"
        selected={settings.language}
        options={(Object.keys(LANGUAGE_LABELS) as LanguagePreference[]).map((value) => ({
          value,
          label: LANGUAGE_LABELS[value],
        }))}
        onSelect={(language) => {
          saveSettings({ language });
          setLanguageOpen(false);
        }}
      />
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={styles.group}>
      <T variant="captionStrong" tone="muted" style={styles.groupTitle}>
        {title.toUpperCase()}
      </T>
      <Card padded={false} style={styles.groupCard}>
        {children}
      </Card>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  subtitle: {
    marginTop: 2,
  },
  profileCard: {
    marginHorizontal: spacing.lg,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileText: {
    flex: 1,
  },
  profileStats: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  group: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
  },
  groupTitle: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    letterSpacing: 0.6,
  },
  groupCard: {
    borderRadius: radius.lg,
  },
  footer: {
    marginTop: spacing.xxl,
  },
}));
