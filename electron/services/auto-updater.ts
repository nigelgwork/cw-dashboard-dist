import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, app } from 'electron';
import { getSetting, setSetting, SettingKeys } from './settings';
import * as fs from 'fs';
import * as path from 'path';

// GitHub repository info for updates
const GITHUB_OWNER = 'nigelgwork';
const GITHUB_REPO = 'cw-dashboard-dist';

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  version: string | null;
  releaseNotes: string | null;
  error: string | null;
}

let mainWindow: BrowserWindow | null = null;
let updateStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloaded: false,
  downloading: false,
  progress: 0,
  version: null,
  releaseNotes: null,
  error: null,
};

/**
 * Configure the GitHub token for private repo access
 */
function configureGitHubToken(): void {
  const token = getSetting(SettingKeys.GITHUB_TOKEN);

  if (token) {
    console.log('[AutoUpdater] Using stored GitHub token for private repo access');
    // Set the feed URL with token for private repository
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      private: true,
      token: token,
    });
  } else {
    console.log('[AutoUpdater] No GitHub token configured - updates from private repo will fail');
    // Try without token (will only work for public repos)
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
    });
  }
}

/**
 * Initialize the auto-updater
 */
export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Configure GitHub token for private repo
  configureGitHubToken();

  // Set up event handlers
  autoUpdater.on('checking-for-update', () => {
    updateStatus = { ...updateStatus, checking: true, error: null };
    notifyRenderer('update:checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    const skipVersion = getSetting(SettingKeys.SKIP_VERSION);

    // Check if user has chosen to skip this version
    if (skipVersion === info.version) {
      console.log(`Skipping update to version ${info.version} (user preference)`);
      updateStatus = { ...updateStatus, checking: false };
      return;
    }

    updateStatus = {
      ...updateStatus,
      checking: false,
      available: true,
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
    };
    notifyRenderer('update:available', {
      version: info.version,
      releaseNotes: updateStatus.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    updateStatus = { ...updateStatus, checking: false, available: false };
    notifyRenderer('update:not-available');
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    updateStatus = {
      ...updateStatus,
      downloading: true,
      progress: Math.round(progress.percent),
    };
    notifyRenderer('update:progress', { percent: updateStatus.progress });
  });

  autoUpdater.on('update-downloaded', async (info: UpdateInfo) => {
    console.log(`[AutoUpdater] Download complete for version ${info.version}, validating...`);

    // Find and validate the downloaded file
    const downloadedFile = findDownloadedUpdate();

    if (downloadedFile) {
      console.log(`[AutoUpdater] Found downloaded file: ${downloadedFile}`);
      const validation = await validateWindowsExecutable(downloadedFile);

      if (!validation.valid) {
        console.error(`[AutoUpdater] Validation failed: ${validation.error}`);

        // Delete the invalid file
        try {
          fs.unlinkSync(downloadedFile);
          console.log('[AutoUpdater] Deleted invalid download file');
        } catch (e) {
          console.error('[AutoUpdater] Failed to delete invalid file:', e);
        }

        updateStatus = {
          ...updateStatus,
          downloading: false,
          downloaded: false,
          error: `Update validation failed: ${validation.error}. The update may have been built for a different platform.`,
        };
        notifyRenderer('update:error', { error: updateStatus.error });
        return;
      }

      console.log('[AutoUpdater] Validation passed');
    } else {
      console.log('[AutoUpdater] Could not find downloaded file for validation (may be OK)');
    }

    updateStatus = {
      ...updateStatus,
      downloading: false,
      downloaded: true,
      progress: 100,
      version: info.version,
    };
    notifyRenderer('update:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (error: Error) => {
    updateStatus = {
      ...updateStatus,
      checking: false,
      downloading: false,
      error: error.message,
    };
    notifyRenderer('update:error', { error: error.message });
    console.error('Auto-updater error:', error);
  });
}

/**
 * Send update event to renderer process
 */
function notifyRenderer(channel: string, data?: Record<string, unknown>): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Validate that a downloaded file is a valid Windows PE executable
 * Checks for MZ header and PE signature
 */
async function validateWindowsExecutable(filePath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(512);
    fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);

    // Check MZ header (DOS stub)
    if (buffer[0] !== 0x4D || buffer[1] !== 0x5A) {
      return { valid: false, error: 'Invalid file format: Missing MZ header' };
    }

    // Get PE header offset from DOS header (at offset 0x3C)
    const peOffset = buffer.readUInt32LE(0x3C);

    if (peOffset > 400) {
      // PE offset is too far, might be invalid
      return { valid: false, error: 'Invalid PE header offset' };
    }

    // Check PE signature
    if (buffer[peOffset] !== 0x50 || buffer[peOffset + 1] !== 0x45 ||
        buffer[peOffset + 2] !== 0x00 || buffer[peOffset + 3] !== 0x00) {
      return { valid: false, error: 'Invalid file format: Missing PE signature' };
    }

    // Check machine type (should be x64 = 0x8664 or x86 = 0x14C)
    const machineType = buffer.readUInt16LE(peOffset + 4);
    if (machineType !== 0x8664 && machineType !== 0x14C) {
      return { valid: false, error: `Unsupported architecture: 0x${machineType.toString(16)}` };
    }

    console.log(`[AutoUpdater] Validated executable: Machine type 0x${machineType.toString(16)} (${machineType === 0x8664 ? 'x64' : 'x86'})`);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Find the downloaded update file in the update cache
 */
function findDownloadedUpdate(): string | null {
  const updateCachePath = path.join(app.getPath('userData'), 'pending');

  if (!fs.existsSync(updateCachePath)) {
    console.log('[AutoUpdater] Update cache path does not exist:', updateCachePath);
    return null;
  }

  const files = fs.readdirSync(updateCachePath);
  const exeFile = files.find(f => f.endsWith('.exe'));

  if (exeFile) {
    return path.join(updateCachePath, exeFile);
  }

  return null;
}

/**
 * Compare two semver version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  setSetting(SettingKeys.LAST_UPDATE_CHECK, new Date().toISOString());
  updateStatus = { ...updateStatus, checking: true, error: null };

  try {
    const currentVersion = app.getVersion();
    console.log(`[AutoUpdater] Current version: ${currentVersion}`);

    const result = await autoUpdater.checkForUpdates();

    if (result?.updateInfo) {
      const remoteVersion = result.updateInfo.version;
      console.log(`[AutoUpdater] Remote version: ${remoteVersion}`);

      const skipVersion = getSetting(SettingKeys.SKIP_VERSION);

      if (skipVersion === remoteVersion) {
        console.log(`[AutoUpdater] Skipping version ${remoteVersion} (user preference)`);
        updateStatus = { ...updateStatus, checking: false, available: false };
      } else if (compareVersions(remoteVersion, currentVersion) > 0) {
        // Remote version is newer
        console.log(`[AutoUpdater] Update available: ${currentVersion} -> ${remoteVersion}`);
        updateStatus = {
          ...updateStatus,
          checking: false,
          available: true,
          version: remoteVersion,
          releaseNotes: typeof result.updateInfo.releaseNotes === 'string'
            ? result.updateInfo.releaseNotes
            : null,
        };
      } else {
        console.log(`[AutoUpdater] Already on latest version`);
        updateStatus = { ...updateStatus, checking: false, available: false };
      }
    } else {
      console.log(`[AutoUpdater] No update info received`);
      updateStatus = { ...updateStatus, checking: false, available: false };
    }
  } catch (error) {
    console.error(`[AutoUpdater] Error checking for updates:`, error);
    updateStatus = {
      ...updateStatus,
      checking: false,
      error: error instanceof Error ? error.message : 'Failed to check for updates',
    };
  }

  return updateStatus;
}

/**
 * Download available update
 */
export async function downloadUpdate(): Promise<void> {
  if (!updateStatus.available) {
    throw new Error('No update available to download');
  }

  updateStatus.downloading = true;
  notifyRenderer('update:downloading');

  await autoUpdater.downloadUpdate();
}

/**
 * Install downloaded update and restart
 */
export function installUpdate(): void {
  if (!updateStatus.downloaded) {
    throw new Error('No update downloaded to install');
  }

  autoUpdater.quitAndInstall(false, true);
}

/**
 * Skip a specific version
 */
export function skipVersion(version: string): void {
  setSetting(SettingKeys.SKIP_VERSION, version);
  updateStatus = { ...updateStatus, available: false };
}

/**
 * Get current update status
 */
export function getUpdateStatus(): UpdateStatus {
  return { ...updateStatus };
}

/**
 * Get current app version
 */
export function getCurrentVersion(): string {
  return app.getVersion();
}

/**
 * Set the GitHub token for private repository access
 * This saves the token and reconfigures the updater
 */
export function setGitHubToken(token: string | null): void {
  if (token) {
    setSetting(SettingKeys.GITHUB_TOKEN, token);
  } else {
    // Delete the token setting if null
    const db = require('../database/connection').getDatabase();
    db.prepare('DELETE FROM settings WHERE key = ?').run(SettingKeys.GITHUB_TOKEN);
  }
  // Reconfigure the updater with the new token
  configureGitHubToken();
}

/**
 * Get the current GitHub token (masked for display)
 */
export function getGitHubTokenStatus(): { hasToken: boolean; maskedToken: string | null } {
  const token = getSetting(SettingKeys.GITHUB_TOKEN);
  if (!token) {
    return { hasToken: false, maskedToken: null };
  }
  // Mask all but first 4 and last 4 characters
  const masked = token.length > 8
    ? `${token.slice(0, 4)}${'*'.repeat(Math.min(token.length - 8, 20))}${token.slice(-4)}`
    : '*'.repeat(token.length);
  return { hasToken: true, maskedToken: masked };
}
