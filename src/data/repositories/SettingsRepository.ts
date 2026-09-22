import type { AppSettings, UserProfile } from '../../domain/models';
import type { BackupPayload, DataSource } from '../DataSource';
import { ValidationError } from './errors';

/** Profile, preferences, and whole-database backup / restore. */
export class SettingsRepository {
  constructor(private readonly source: DataSource) {}

  getProfile(): Promise<UserProfile> {
    return this.source.getProfile();
  }

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    if (patch.name != null && !patch.name.trim()) {
      throw new ValidationError('Enter your name.', 'name');
    }
    return this.source.updateProfile({
      ...patch,
      name: patch.name?.trim(),
      email: patch.email?.trim() || undefined,
      village: patch.village?.trim() || undefined,
    });
  }

  getSettings(): Promise<AppSettings> {
    return this.source.getSettings();
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    if (patch.suggestionRounding != null && patch.suggestionRounding < 1) {
      throw new ValidationError('Rounding must be at least 1.', 'suggestionRounding');
    }
    return this.source.updateSettings(patch);
  }

  exportBackup(): Promise<BackupPayload> {
    return this.source.exportAll();
  }

  /** Replaces every record. The caller must confirm with the user first. */
  async restoreBackup(json: string): Promise<void> {
    let payload: BackupPayload;
    try {
      payload = JSON.parse(json);
    } catch {
      throw new ValidationError('That file is not a valid Moi Manager backup.');
    }
    if (payload?.version !== 1 || !Array.isArray(payload.people)) {
      throw new ValidationError('That backup was made by a different version.');
    }
    await this.source.importAll(payload);
  }

  /** Wipes everything and restores the bundled demo data. */
  resetDemoData(): Promise<void> {
    return this.source.resetToSeed();
  }
}
