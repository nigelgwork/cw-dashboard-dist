import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import { initDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc/handlers';
import { initAutoUpdater } from './services/auto-updater';
import { getSetting, setSetting, SettingKeys } from './services/settings';
import { requestSync } from './services/sync';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let shouldAutoSync = false; // Flag for auto-sync after version change

const isDev = !app.isPackaged;

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

    // Initialize auto-updater (production only)
    if (!isDev && mainWindow) {
      initAutoUpdater(mainWindow);
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

// Export for type checking in other modules
export { mainWindow };
