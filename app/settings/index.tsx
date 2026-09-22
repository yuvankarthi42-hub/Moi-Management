import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import {
  AppHeader, Avatar, Card, ListRow, RowDivider, Screen, ScreenScroll, StatRow, T,
} from '../../src/components/ui';
import type { LanguagePreference, ThemePreference } from '../../src/domain/models';
import { selectOverview } from '../../src/domain/selectors';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, spacing } from '../../src/theme';
import { formatCount, formatMoneyCompact, formatPhone } from '../../src/utils/format';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const LANGUAGE_LABELS: Record<LanguagePreference, string> = {
  en: 'English',
  ta: 'தமிழ் (Tamil)',
};

const ROUNDING_OPTIONS = [1, 10, 50, 100, 500];

export default function SettingsScreen() {
  const router = useRouter();
  const { data, saveSettings, resetDemoData, repositories } = useAppData();

  const [themeOpen, setThemeOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [roundingOpen, setRoundingOpen] = useState(false);

  const overview = useMemo(() => selectOverview(data), [data]);
  const { settings, profile } = data;

  /** Writes the whole database to a JSON file and opens the share sheet. */
  const backup = async () => {
    try {
      const payload = await repositories.settings.exportBackup();
      const name = `moi-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const uri = `${FileSystem.cacheDirectory}${name}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save your Moi Manager backup',
        });
      } else {
        Alert.alert('Backup saved', `The file is at:\n${uri}`);
      }
    } catch (error) {
      Alert.alert(
        'Backup failed',
        error instanceof Error ? error.message : 'The backup could not be created.',
      );
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset demo data?',
      'Every function, person and moi entry you have added will be replaced with the sample data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetDemoData() },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader title="Profile & Settings" showBack bleed={56} />

      <ScreenScroll>
        <Card style={styles.profileCard} elevation={2}>
          <View style={styles.profileRow}>
            <Avatar name={profile.name || 'Me'} uri={profile.photoUri} seed={profile.id} size={58} />
            <View style={styles.profileText}>
              <T variant="h3" numberOfLines={1}>
                {profile.name || 'Add your name'}
              </T>
              <T variant="caption" tone="muted" numberOfLines={1}>
                {[profile.phone ? formatPhone(profile.phone) : undefined, profile.email]
                  .filter(Boolean)
                  .join(' · ') || 'Tap edit to add your details'}
              </T>
            </View>
          </View>

          <View style={styles.profileStats}>
            <StatRow
              compactLabels
              items={[
                { label: 'Functions', value: formatCount(overview.functionCount) },
                { label: 'Collected', value: formatMoneyCompact(overview.totalMoi), tone: 'success' },
                { label: 'People', value: formatCount(overview.peopleCount) },
              ]}
            />
          </View>
        </Card>

        <SettingsGroup title="Account">
          <ListRow
            icon="person-outline"
            title="My Profile"
            subtitle="Name, phone and village"
            onPress={() => router.push('/settings/profile')}
          />
          <RowDivider />
          <ListRow
            icon="home-outline"
            title="Families"
            value={`${data.families.length}`}
            subtitle="Group people into families"
            onPress={() => router.push('/settings/families')}
          />
        </SettingsGroup>

        <SettingsGroup title="Moi suggestions">
          <ListRow
            icon="calculator-outline"
            title="Round suggestions to"
            value={`₹${settings.suggestionRounding}`}
            subtitle="Used by the return moi report"
            onPress={() => setRoundingOpen(true)}
          />
          <RowDivider />
          <ListRow
            icon="sparkles-outline"
            title="Add the auspicious ₹1"
            subtitle="Suggest 1001 instead of 1000"
            showChevron={false}
            right={
              <Switch
                value={settings.auspiciousRupee}
                onValueChange={(value) => saveSettings({ auspiciousRupee: value })}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel="Add the auspicious one rupee"
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title="App">
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
        </SettingsGroup>

        <SettingsGroup title="Data">
          <ListRow
            icon="cloud-download-outline"
            title="Backup & Restore"
            subtitle="Save a copy of every record"
            onPress={backup}
          />
          <RowDivider />
          <ListRow
            icon="refresh-outline"
            title="Reset demo data"
            subtitle="Start again from the sample records"
            destructive
            onPress={confirmReset}
          />
        </SettingsGroup>

        <SettingsGroup title="About">
          <ListRow
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() =>
              Alert.alert(
                'Help & Support',
                'Moi Manager keeps your family function records on this device. Use Backup & Restore to keep a copy safe.',
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
        </SettingsGroup>

        <T variant="caption" tone="muted" center style={styles.footer}>
          Your records stay on this device.{'\n'}Take a backup before changing phones.
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

      <OptionPicker
        visible={roundingOpen}
        onClose={() => setRoundingOpen(false)}
        title="Round suggestions to"
        selected={String(settings.suggestionRounding)}
        options={ROUNDING_OPTIONS.map((value) => ({
          value: String(value),
          label: `₹${value}`,
          description: value === 1 ? 'No rounding' : `Nearest ₹${value}`,
        }))}
        onSelect={(value) => {
          saveSettings({ suggestionRounding: Number(value) });
          setRoundingOpen(false);
        }}
      />
    </Screen>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <T variant="captionStrong" tone="muted" style={styles.groupTitle}>
        {title.toUpperCase()}
      </T>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
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
  footer: {
    marginTop: spacing.xxl,
  },
});
