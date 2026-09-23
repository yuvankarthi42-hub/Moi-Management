import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { BackupPayload } from '../data/DataSource';

/**
 * Whole-database backup and restore (spec §21).
 *
 * The payload is versioned so a future schema change can migrate rather than
 * reject, and a restore always goes through a confirmation at the call site —
 * it replaces every record.
 */

export interface BackupSummary {
  uri: string;
  fileName: string;
  /** Rough size in bytes, for showing the user what they are about to share. */
  bytes: number;
}

/** Writes the backup to a cache file and returns where it landed. */
export async function backupToFile(payload: BackupPayload): Promise<BackupSummary> {
  const fileName = `moi-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  const json = JSON.stringify(payload, null, 2);
  await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
  return { uri, fileName, bytes: json.length };
}

/** Hands a written backup to the OS share sheet so the user can store it. */
export async function shareBackup(summary: BackupSummary): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(summary.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save your Moi Manager backup',
    UTI: 'public.json',
  });
  return true;
}

/** Reads a backup file the user picked. */
export async function readBackupFile(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

/** A human summary of what a backup holds, shown before restoring. */
export function describeBackup(json: string): string | undefined {
  try {
    const payload = JSON.parse(json) as BackupPayload;
    if (payload?.version !== 1) return undefined;
    const counts = [
      `${payload.functions?.length ?? 0} functions`,
      `${payload.people?.length ?? 0} people`,
      `${payload.moiEntries?.length ?? 0} moi entries`,
      `${payload.expenses?.length ?? 0} expenses`,
    ];
    return counts.join(', ');
  } catch {
    return undefined;
  }
}
