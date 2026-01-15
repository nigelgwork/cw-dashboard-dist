import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as projectService from '../services/projects';
import * as opportunityService from '../services/opportunities';
import * as serviceTicketService from '../services/service-tickets';
import * as syncService from '../services/sync';
import * as feedService from '../services/feeds';
import * as settingsService from '../services/settings';
import * as autoUpdaterService from '../services/auto-updater';

/**
 * Register all IPC handlers for communication with renderer process
 */
export function registerIpcHandlers(): void {
  // ============================================
  // Projects
  // ============================================
  ipcMain.handle('projects:getAll', async (_, options) => {
    return projectService.getAll(options);
  });

  ipcMain.handle('projects:getById', async (_, id: number) => {
    return projectService.getById(id);
  });

  ipcMain.handle('projects:getByExternalId', async (_, externalId: string) => {
    return projectService.getByExternalId(externalId);
  });

  ipcMain.handle('projects:clearAll', async () => {
    return projectService.clearAll();
  });

  // ============================================
  // Opportunities
  // ============================================
  ipcMain.handle('opportunities:getAll', async (_, options) => {
    return opportunityService.getAll(options);
  });

  ipcMain.handle('opportunities:getById', async (_, id: number) => {
    return opportunityService.getById(id);
  });

  ipcMain.handle('opportunities:getByExternalId', async (_, externalId: string) => {
    return opportunityService.getByExternalId(externalId);
  });

  ipcMain.handle('opportunities:getStages', async () => {
    return opportunityService.getStages();
  });

  ipcMain.handle('opportunities:getSalesReps', async () => {
    return opportunityService.getSalesReps();
  });

  ipcMain.handle('opportunities:clearAll', async () => {
    return opportunityService.clearAll();
  });

  // ============================================
  // Service Tickets
  // ============================================
  ipcMain.handle('serviceTickets:getAll', async (_, options) => {
    return serviceTicketService.getAll(options);
  });

  ipcMain.handle('serviceTickets:getById', async (_, id: number) => {
    return serviceTicketService.getById(id);
  });

  ipcMain.handle('serviceTickets:getByExternalId', async (_, externalId: string) => {
    return serviceTicketService.getByExternalId(externalId);
  });

  ipcMain.handle('serviceTickets:getStatuses', async () => {
    return serviceTicketService.getStatuses();
  });

  ipcMain.handle('serviceTickets:getPriorities', async () => {
    return serviceTicketService.getPriorities();
  });

  ipcMain.handle('serviceTickets:getAssignees', async () => {
    return serviceTicketService.getAssignees();
  });

  ipcMain.handle('serviceTickets:getCompanies', async () => {
    return serviceTicketService.getCompanies();
  });

  ipcMain.handle('serviceTickets:getBoards', async () => {
    return serviceTicketService.getBoards();
  });

  ipcMain.handle('serviceTickets:clearAll', async () => {
    return serviceTicketService.clearAll();
  });

  // ============================================
  // Sync
  // ============================================
  ipcMain.handle('sync:request', async (event, syncType: string) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return syncService.requestSync(syncType as 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'ALL', window);
  });

  ipcMain.handle('sync:getStatus', async () => {
    return syncService.getStatus();
  });

  ipcMain.handle('sync:getHistory', async (_, options) => {
    return syncService.getHistory(options);
  });

  ipcMain.handle('sync:getChanges', async (_, syncHistoryId: number) => {
    return syncService.getChanges(syncHistoryId);
  });

  ipcMain.handle('sync:cancel', async (_, syncId: number) => {
    return syncService.cancelSync(syncId);
  });

  ipcMain.handle('sync:clearHistory', async () => {
    return syncService.clearHistory();
  });

  // ============================================
  // ATOM Feeds
  // ============================================
  ipcMain.handle('feeds:getAll', async () => {
    return feedService.getAllFeeds();
  });

  ipcMain.handle('feeds:import', async (_, filePath: string) => {
    return feedService.importFeed(filePath);
  });

  ipcMain.handle('feeds:importFromDialog', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window!, {
      title: 'Import ATOMSVC File',
      filters: [
        { name: 'ATOM Service Files', extensions: ['atomsvc', 'xml'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }

    const importedFeeds = [];
    for (const filePath of result.filePaths) {
      const feeds = await feedService.importFeed(filePath);
      importedFeeds.push(...feeds);
    }
    return importedFeeds;
  });

  ipcMain.handle('feeds:delete', async (_, feedId: number) => {
    return feedService.deleteFeed(feedId);
  });

  ipcMain.handle('feeds:test', async (_, feedId: number) => {
    return feedService.testFeed(feedId);
  });

  ipcMain.handle('feeds:update', async (_, feedId: number, updates: { name?: string; feedType?: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' }) => {
    return feedService.updateFeed(feedId, updates);
  });

  // ============================================
  // Settings
  // ============================================
  ipcMain.handle('settings:get', async (_, key: string) => {
    return settingsService.getSetting(key);
  });

  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    return settingsService.setSetting(key, value);
  });

  ipcMain.handle('settings:getAll', async () => {
    return settingsService.getAllSettings();
  });

  // ============================================
  // Updates
  // ============================================
  ipcMain.handle('updates:check', async () => {
    const status = await autoUpdaterService.checkForUpdates();
    return {
      updateAvailable: status.available,
      version: status.version,
      releaseNotes: status.releaseNotes,
    };
  });

  ipcMain.handle('updates:download', async () => {
    await autoUpdaterService.downloadUpdate();
  });

  ipcMain.handle('updates:install', async () => {
    autoUpdaterService.installUpdate();
  });

  ipcMain.handle('updates:getStatus', async () => {
    return autoUpdaterService.getUpdateStatus();
  });

  ipcMain.handle('updates:getVersion', async () => {
    return autoUpdaterService.getCurrentVersion();
  });

  ipcMain.handle('updates:skipVersion', async (_, version: string) => {
    autoUpdaterService.skipVersion(version);
  });

  ipcMain.handle('updates:setGitHubToken', async (_, token: string | null) => {
    autoUpdaterService.setGitHubToken(token);
  });

  ipcMain.handle('updates:getGitHubTokenStatus', async () => {
    return autoUpdaterService.getGitHubTokenStatus();
  });

  console.log('IPC handlers registered');
}
