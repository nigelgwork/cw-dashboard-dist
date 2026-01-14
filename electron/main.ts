import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import { initDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc/handlers';
import { initAutoUpdater } from './services/auto-updater';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

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
