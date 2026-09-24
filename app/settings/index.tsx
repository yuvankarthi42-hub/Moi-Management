import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { OptionPicker } from '../../src/components/app/OptionPicker';
import { AppHeader, Card, ListRow, RowDivider, Screen, ScreenScroll, T } from '../../src/components/ui';
import type { NotificationSettings } from '../../src/domain/models';
import { useAppData } from '../../src/store/AppDataProvider';
import { makeStyles, spacing, useColors } from '../../src/theme';

const ROUNDING_OPTIONS = [1, 10, 50, 100, 500];

const REMINDERS: Array<{
  key: keyof NotificationSettings;
  title: string;
  subtitle: string;
}> = [
  { key: 'upcomingFunction', title: 'Upcoming function', subtitle: 'A week before the date' },
  { key: 'functionTomorrow', title: 'Function tomorrow', subtitle: 'The evening before' },
  { key: 'returnMoi', title: 'Return moi due', subtitle: 'When a guest hosts their own function' },
  { key: 'backupReminder', title: 'Backup reminder', subtitle: 'Monthly, if you have not saved one' },
];

/**
 * App-level preferences. Profile, families, theme, language and backup all live
 * on the More tab — this screen holds the settings that change how the app
 * *calculates* and *reminds*, not who you are.
 */
export default function AppSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = useStyles();
  const { data, saveSettings } = useAppData();
  const [roundingOpen, setRoundingOpen] = useState(false);

  const { settings } = data;

  const toggleReminder = (key: keyof NotificationSettings, value: boolean) =>
    saveSettings({ notifications: { ...settings.notifications, [key]: value } });

  return (
    <Screen>
      <AppHeader title="App Settings" showBack onBack={() => router.back()} />

      <ScreenScroll>
        <Group title="Moi suggestions">
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
            subtitle="Suggest ₹1,001 instead of ₹1,000"
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
        </Group>

        <Group title="Reminders">
          {REMINDERS.map((reminder, index) => (
            <View key={reminder.key}>
              {index > 0 ? <RowDivider /> : null}
              <ListRow
                icon="notifications-outline"
                title={reminder.title}
                subtitle={reminder.subtitle}
                showChevron={false}
                right={
                  <Switch
                    value={settings.notifications[reminder.key]}
                    onValueChange={(value) => toggleReminder(reminder.key, value)}
                    trackColor={{ true: colors.primary, false: colors.borderStrong }}
                    thumbColor={colors.surface}
                    accessibilityLabel={reminder.title}
                  />
                }
              />
            </View>
          ))}
        </Group>

        <Group title="Privacy">
          <ListRow
            icon="eye-off-outline"
            title="Hide amounts on Home"
            subtitle="Keep totals off the screen in company"
            showChevron={false}
            right={
              <Switch
                value={settings.hideAmountsOnHome}
                onValueChange={(value) => saveSettings({ hideAmountsOnHome: value })}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.surface}
                accessibilityLabel="Hide amounts on Home"
              />
            }
          />
          <RowDivider />
          <ListRow
            icon="lock-closed-outline"
            title="Where your data lives"
            subtitle="On this device only — nothing is uploaded"
            showChevron={false}
            onPress={() =>
              Alert.alert(
                'Your data',
                'Every function, person, moi entry and expense is stored on this phone. Nothing is sent to a server. Use Backup & Restore to keep your own copy.',
              )
            }
          />
        </Group>

        <T variant="caption" tone="muted" center style={styles.footer}>
          Reminders are stored as preferences; scheduling them needs notification{'\n'}
          permission, which the app asks for the first time one is due.
        </T>
      </ScreenScroll>

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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <T variant="captionStrong" tone="muted" style={styles.groupTitle}>
        {title.toUpperCase()}
      </T>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

const useStyles = makeStyles(() => ({
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
    marginHorizontal: spacing.lg,
  },
}));
