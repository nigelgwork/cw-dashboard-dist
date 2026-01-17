import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as projectService from '../services/projects';
import * as opportunityService from '../services/opportunities';
import * as serviceTicketService from '../services/service-tickets';
import * as syncService from '../services/sync';
import * as feedService from '../services/feeds';
import * as settingsService from '../services/settings';
import * as autoUpdaterService from '../services/auto-updater';
import {
  validateId,
  validateString,
  validateSyncType,
  validateQueryOptions,
  validateFeedUpdateOptions,
  validateSettingKey,
} from './validation';

/**
 * Register all IPC handlers for communication with renderer process
 */
export function registerIpcHandlers(): void {
  // ============================================
  // Projects
  // ============================================
  ipcMain.handle('projects:getAll', async (_, options) => {
    return projectService.getAll(validateQueryOptions(options));
  });

  ipcMain.handle('projects:getById', async (_, id: unknown) => {
    return projectService.getById(validateId(id));
  });

  ipcMain.handle('projects:getByExternalId', async (_, externalId: unknown) => {
    return projectService.getByExternalId(validateString(externalId, 'externalId'));
  });

  ipcMain.handle('projects:clearAll', async () => {
    return projectService.clearAll();
  });

  ipcMain.handle('projects:getStatuses', async () => {
    return projectService.getStatuses();
  });

  ipcMain.handle('projects:getAvailableDetailFields', async () => {
    return projectService.getAvailableDetailFields();
  });

  // ============================================
  // Opportunities
  // ============================================
  ipcMain.handle('opportunities:getAll', async (_, options) => {
    return opportunityService.getAll(validateQueryOptions(options));
  });

  ipcMain.handle('opportunities:getById', async (_, id: unknown) => {
    return opportunityService.getById(validateId(id));
  });

  ipcMain.handle('opportunities:getByExternalId', async (_, externalId: unknown) => {
    return opportunityService.getByExternalId(validateString(externalId, 'externalId'));
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
    return serviceTicketService.getAll(validateQueryOptions(options));
  });

  ipcMain.handle('serviceTickets:getById', async (_, id: unknown) => {
    return serviceTicketService.getById(validateId(id));
  });

  ipcMain.handle('serviceTickets:getByExternalId', async (_, externalId: unknown) => {
    return serviceTicketService.getByExternalId(validateString(externalId, 'externalId'));
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
  ipcMain.handle('sync:request', async (event, syncType: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return syncService.requestSync(validateSyncType(syncType), window);
  });

  ipcMain.handle('sync:getStatus', async () => {
    return syncService.getStatus();
  });

  ipcMain.handle('sync:getHistory', async (_, options) => {
    return syncService.getHistory(validateQueryOptions(options));
  });

  ipcMain.handle('sync:getChanges', async (_, syncHistoryId: unknown) => {
    return syncService.getChanges(validateId(syncHistoryId, 'syncHistoryId'));
  });

  ipcMain.handle('sync:cancel', async (_, syncId: unknown) => {
    return syncService.cancelSync(validateId(syncId, 'syncId'));
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

  ipcMain.handle('feeds:import', async (_, filePath: unknown) => {
    return feedService.importFeed(validateString(filePath, 'filePath'));
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

  ipcMain.handle('feeds:delete', async (_, feedId: unknown) => {
    return feedService.deleteFeed(validateId(feedId, 'feedId'));
  });

  ipcMain.handle('feeds:test', async (_, feedId: unknown) => {
    return feedService.testFeed(validateId(feedId, 'feedId'));
  });

  ipcMain.handle('feeds:update', async (_, feedId: unknown, updates: unknown) => {
    return feedService.updateFeed(validateId(feedId, 'feedId'), validateFeedUpdateOptions(updates));
  });

  ipcMain.handle('feeds:linkDetail', async (_, summaryFeedId: unknown, detailFeedId: unknown) => {
    return feedService.linkDetailFeed(validateId(summaryFeedId, 'summaryFeedId'), validateId(detailFeedId, 'detailFeedId'));
  });

  ipcMain.handle('feeds:unlinkDetail', async (_, summaryFeedId: unknown) => {
    return feedService.unlinkDetailFeed(validateId(summaryFeedId, 'summaryFeedId'));
  });

  ipcMain.handle('feeds:getDetailFeeds', async () => {
    return feedService.getDetailFeeds();
  });

  ipcMain.handle('feeds:getDetailSyncDiagnostics', async () => {
    return feedService.getDetailSyncConfigDiagnostics();
  });

  ipcMain.handle('feeds:testFetchProjectDetail', async (_, projectId?: unknown) => {
    return feedService.testFetchProjectDetail(projectId !== undefined ? validateString(projectId, 'projectId') : undefined);
  });

  ipcMain.handle('feeds:getAvailableTemplates', async () => {
    return feedService.getAvailableTemplates();
  });

  ipcMain.handle('feeds:exportTemplates', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window!, {
      title: 'Select Folder to Export Templates',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { exported: [], errors: [], cancelled: true };
    }

    const exportResult = await feedService.exportTemplatesToDirectory(result.filePaths[0]);
    return { ...exportResult, cancelled: false };
  });

  ipcMain.handle('feeds:importTemplate', async (_, filename: unknown) => {
    const validFilename = validateString(filename, 'filename');
    const content = feedService.getTemplateContent(validFilename);
    if (!content) {
      throw new Error(`Template not found: ${filename}`);
    }

    // Parse and import the template
    const { parseAtomSvcFile } = await import('../services/atomsvc-parser');
    const parsedFeeds = await parseAtomSvcFile(content);

    const db = (await import('../database/connection')).getDatabase();
    const importedFeeds: feedService.AtomFeed[] = [];

    for (const feed of parsedFeeds) {
      // Check if feed URL already exists
      const existing = db.prepare('SELECT id FROM atom_feeds WHERE feed_url = ?').get(feed.feedUrl) as { id: number } | undefined;

      if (existing) {
        // Update existing feed
        db.prepare("UPDATE atom_feeds SET name = ?, feed_type = ?, updated_at = datetime('now') WHERE id = ?").run(
          feed.name,
          feed.feedType,
          existing.id
        );
        importedFeeds.push(feedService.getFeedById(existing.id)!);
      } else {
        // Insert new feed
        const result = db.prepare('INSERT INTO atom_feeds (name, feed_type, feed_url) VALUES (?, ?, ?)').run(
          feed.name,
          feed.feedType,
          feed.feedUrl
        );
        importedFeeds.push(feedService.getFeedById(result.lastInsertRowid as number)!);
      }
    }

    return importedFeeds;
  });

  ipcMain.handle('projects:getDetailSyncDiagnostics', async () => {
    return projectService.getDetailSyncDiagnostics();
  });

  // ============================================
  // Settings
  // ============================================
  ipcMain.handle('settings:get', async (_, key: unknown) => {
    return settingsService.getSetting(validateSettingKey(key));
  });

  ipcMain.handle('settings:set', async (_, key: unknown, value: unknown) => {
    return settingsService.setSetting(validateSettingKey(key), validateString(value, 'value'));
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

  ipcMain.handle('updates:setGitHubToken', async (_, token: unknown) => {
    if (token !== null && token !== undefined) {
      autoUpdaterService.setGitHubToken(validateString(token, 'token'));
    } else {
      autoUpdaterService.setGitHubToken(null);
    }
  });

  ipcMain.handle('updates:getGitHubTokenStatus', async () => {
    return autoUpdaterService.getGitHubTokenStatus();
  });

  console.log('IPC handlers registered');
}
