import { app, BrowserWindow, ipcMain, dialog, session, safeStorage } from 'electron';
import path from 'path';
import { initDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc/handlers';
import { initAutoUpdater, checkForUpdates } from './services/auto-updater';
import { getSetting, setSetting, SettingKeys } from './services/settings';
import { requestSync } from './services/sync';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let shouldAutoSync = false; // Flag for auto-sync after version change
let updateCheckInterval: NodeJS.Timeout | null = null;

const isDev = !app.isPackaged;
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: path.join(__dirname, '..', 'resources', 'icon.ico'),
    show: false,
    backgroundColor: '#0F172A', // Match app background
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();

    // Trigger auto-sync after version update (once window is ready to receive events)
    if (shouldAutoSync && mainWindow) {
      console.log('[Main] Version changed, triggering automatic sync...');
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Notify frontend that auto-sync is starting due to update
          mainWindow.webContents.send('app:version-updated', {
            version: app.getVersion(),
            message: 'App updated - syncing data...',
          });

          // Trigger sync for all data types
          requestSync('ALL', mainWindow).catch((err) => {
            console.error('[Main] Auto-sync after update failed:', err);
          });
        }
      }, 1500); // Small delay to let frontend initialize
    }
  });

  // Load the app
  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  try {
    // Configure session for Windows Integrated Authentication (NTLM/Negotiate)
    // Allow auth for all servers - required for SSRS feeds
    session.defaultSession.allowNTLMCredentialsForDomains('*');

    // Initialize database
    await initDatabase();

    // Check if version has changed (for auto-sync after update)
    const currentVersion = app.getVersion();
    const lastRunVersion = getSetting(SettingKeys.LAST_RUN_VERSION);

    if (lastRunVersion !== currentVersion) {
      console.log(`[Main] Version changed: ${lastRunVersion || 'first run'} -> ${currentVersion}`);
      shouldAutoSync = true;
      // Update the stored version
      setSetting(SettingKeys.LAST_RUN_VERSION, currentVersion);
    }

    // Register IPC handlers
    registerIpcHandlers();

    // Create window
    createWindow();

    // Set up Content Security Policy
    setupContentSecurityPolicy();

    // Initialize auto-updater (production only)
    if (!isDev && mainWindow) {
      initAutoUpdater(mainWindow);
      // Start periodic update checks (once per day)
      startPeriodicUpdateCheck();
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox('Initialization Error', `Failed to start CW Dashboard: ${error}`);
    app.quit();
  }

  app.on('activate', () => {
    // macOS: re-create window when dock icon clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Quit on all platforms (including macOS for this Windows-focused app)
  app.quit();
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

/**
 * Set up Content Security Policy
 */
function setupContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"
        ]
      }
    });
  });
}

/**
 * Start periodic update checks (once per day)
 * Notifies the renderer when an update is available
 */
function startPeriodicUpdateCheck(): void {
  // Check if we should run an update check based on last check time
  const lastCheck = getSetting(SettingKeys.LAST_UPDATE_CHECK);
  const now = Date.now();

  if (lastCheck) {
    const lastCheckTime = new Date(lastCheck).getTime();
    const timeSinceCheck = now - lastCheckTime;

    // If less than 24 hours since last check, schedule next check accordingly
    if (timeSinceCheck < UPDATE_CHECK_INTERVAL) {
      const nextCheckDelay = UPDATE_CHECK_INTERVAL - timeSinceCheck;
      console.log(`[Main] Next update check in ${Math.round(nextCheckDelay / 1000 / 60)} minutes`);
      setTimeout(() => {
        performUpdateCheck();
        startUpdateCheckInterval();
      }, nextCheckDelay);
      return;
    }
  }

  // Perform immediate check (with small delay to let app initialize)
  setTimeout(() => {
    performUpdateCheck();
    startUpdateCheckInterval();
  }, 5000);
}

/**
 * Start the 24-hour interval for update checks
 */
function startUpdateCheckInterval(): void {
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
  }

  updateCheckInterval = setInterval(() => {
    performUpdateCheck();
  }, UPDATE_CHECK_INTERVAL);
}

/**
 * Perform an update check and notify renderer if update available
 */
async function performUpdateCheck(): Promise<void> {
  try {
    console.log('[Main] Performing periodic update check...');
    const status = await checkForUpdates();

    if (status.available && mainWindow && !mainWindow.isDestroyed()) {
      console.log(`[Main] Update available: ${status.version}`);
      mainWindow.webContents.send('update:available-background', {
        version: status.version,
        releaseNotes: status.releaseNotes,
      });
    }
  } catch (error) {
    console.error('[Main] Periodic update check failed:', error);
  }
}

// Export for type checking in other modules
export { mainWindow };
