import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  AppHeader, Button, Card, ListRow, RowDivider, Screen, ScreenScroll, StatRow, T, useToast,
} from '../../src/components/ui';
import { selectOverview } from '../../src/domain/selectors';
import {
  backupToFile, describeBackup, readBackupFile, shareBackup,
} from '../../src/services/backupService';
import { useAppData } from '../../src/store/AppDataProvider';
import { colors, makeStyles, spacing, useColors } from '../../src/theme';
import { formatCount, formatMoneyCompact } from '../../src/utils/format';

/** Export and import the whole database (spec §21). */
export default function BackupScreen() {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { data, repositories, restoreBackup, resetDemoData } = useAppData();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<'export' | 'import' | undefined>();

  const overview = useMemo(() => selectOverview(data), [data]);

  const exportBackup = async () => {
    setBusy('export');
    try {
      const payload = await repositories.settings.exportBackup();
      const summary = await backupToFile(payload);
      const shared = await shareBackup(summary);
      if (shared) showToast({ message: 'Backup ready to save' });
      else Alert.alert('Backup saved', `The file is at:\n${summary.uri}`);
    } catch (error) {
      Alert.alert(
        'Backup failed',
        error instanceof Error ? error.message : 'The backup could not be created.',
      );
    } finally {
      setBusy(undefined);
    }
  };

  const importBackup = async () => {
    setBusy('import');
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      const json = await readBackupFile(picked.assets[0].uri);
      const summary = describeBackup(json);
      if (!summary) {
        Alert.alert('Not a Moi Manager backup', 'Choose a backup file created by this app.');
        return;
      }

      // Restoring replaces everything, so it is never done silently (spec §21).
      Alert.alert(
        'Restore this backup?',
        `It contains ${summary}.\n\nEverything currently in the app will be replaced. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace everything',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(json);
                showToast({ message: 'Backup restored' });
              } catch (error) {
                Alert.alert(
                  'Restore failed',
                  error instanceof Error ? error.message : 'That backup could not be read.',
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Could not read the file',
        error instanceof Error ? error.message : 'Please try another file.',
      );
    } finally {
      setBusy(undefined);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset to demo data?',
      'Every function, person, moi entry and expense you have added will be replaced with the sample records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetDemoData();
            showToast({ message: 'Demo data restored' });
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <AppHeader title="Backup & Restore" showBack onBack={() => router.back()} bleed={46} />

      <ScreenScroll>
        <Card style={styles.card} elevation={2}>
          <T variant="smallStrong" tone="secondary" style={styles.cardLabel}>
            This backup will contain
          </T>
          <StatRow
            compactLabels
            items={[
              { label: 'Functions', value: formatCount(overview.functionCount) },
              { label: 'People', value: formatCount(overview.peopleCount) },
              { label: 'Moi', value: formatCount(overview.entryCount) },
              { label: 'Expenses', value: formatCount(overview.totalExpenses) },
            ]}
          />
          <View style={styles.valueRow}>
            <T variant="small" tone="secondary">
              Total moi recorded
            </T>
            <T variant="bodyStrong" tone="success">
              {formatMoneyCompact(overview.totalMoi)}
            </T>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            label="Export Backup"
            icon="cloud-upload-outline"
            block
            loading={busy === 'export'}
            disabled={busy != null}
            onPress={exportBackup}
          />
          <Button
            label="Import Backup"
            icon="cloud-download-outline"
            variant="outline"
            block
            loading={busy === 'import'}
            disabled={busy != null}
            onPress={importBackup}
          />
        </View>

        <Card padded={false} style={styles.card}>
          <ListRow
            icon="shield-checkmark-outline"
            title="Versioned format"
            subtitle="Backups record a version so future releases can still read them."
            showChevron={false}
          />
          <RowDivider />
          <ListRow
            icon="warning-outline"
            title="Restore replaces everything"
            subtitle="You are always asked to confirm before anything is overwritten."
            showChevron={false}
          />
          <RowDivider />
          <ListRow
            icon="refresh-outline"
            title="Reset to demo data"
            subtitle="Start again from the sample records"
            destructive
            onPress={confirmReset}
          />
        </Card>

        <T variant="caption" tone="muted" center style={styles.footer}>
          Take a backup before changing phones — records live only on this device.
        </T>
      </ScreenScroll>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  cardLabel: {
    marginBottom: spacing.md,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actions: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.xxl,
  },
}));
