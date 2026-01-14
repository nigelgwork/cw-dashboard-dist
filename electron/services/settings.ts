import { getDatabase } from '../database/connection';

export interface Setting {
  key: string;
  value: string;
}

/**
 * Get a setting value by key
 */
export function getSetting(key: string): string | null {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/**
 * Get a setting value with a default
 */
export function getSettingWithDefault(key: string, defaultValue: string): string {
  return getSetting(key) ?? defaultValue;
}

/**
 * Set a setting value
 */
export function setSetting(key: string, value: string): void {
  const db = getDatabase();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

/**
 * Delete a setting
 */
export function deleteSetting(key: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM settings WHERE key = ?').run(key);
}

/**
 * Get all settings
 */
export function getAllSettings(): Setting[] {
  const db = getDatabase();
  return db.prepare('SELECT key, value FROM settings ORDER BY key').all() as Setting[];
}

/**
 * Get multiple settings by keys
 */
export function getSettings(keys: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const key of keys) {
    result[key] = getSetting(key);
  }
  return result;
}

/**
 * Set multiple settings at once
 */
export function setSettings(settings: Record<string, string>): void {
  const db = getDatabase();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, value);
    }
  });

  transaction();
}

// Common setting keys
export const SettingKeys = {
  SYNC_INTERVAL_MINUTES: 'sync_interval_minutes',
  AUTO_SYNC_ENABLED: 'auto_sync_enabled',
  LAST_UPDATE_CHECK: 'last_update_check',
  SKIP_VERSION: 'skip_version',
  WINDOW_BOUNDS: 'window_bounds',
  THEME: 'theme',
  GITHUB_TOKEN: 'github_token',
} as const;

// Default values
export const SettingDefaults = {
  [SettingKeys.SYNC_INTERVAL_MINUTES]: '60',
  [SettingKeys.AUTO_SYNC_ENABLED]: 'true',
  [SettingKeys.THEME]: 'dark',
} as const;

/**
 * Get typed setting helpers
 */
export function getSyncIntervalMinutes(): number {
  const value = getSetting(SettingKeys.SYNC_INTERVAL_MINUTES);
  return value ? parseInt(value, 10) : parseInt(SettingDefaults[SettingKeys.SYNC_INTERVAL_MINUTES], 10);
}

export function isAutoSyncEnabled(): boolean {
  const value = getSetting(SettingKeys.AUTO_SYNC_ENABLED);
  return value ? value === 'true' : SettingDefaults[SettingKeys.AUTO_SYNC_ENABLED] === 'true';
}

export function getWindowBounds(): { x: number; y: number; width: number; height: number } | null {
  const value = getSetting(SettingKeys.WINDOW_BOUNDS);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function setWindowBounds(bounds: { x: number; y: number; width: number; height: number }): void {
  setSetting(SettingKeys.WINDOW_BOUNDS, JSON.stringify(bounds));
}
