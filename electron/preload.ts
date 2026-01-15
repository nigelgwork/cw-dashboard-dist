import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for the exposed API
export interface ElectronAPI {
  // Projects
  projects: {
    getAll: (options?: ProjectQueryOptions) => Promise<Project[]>;
    getById: (id: number) => Promise<Project | null>;
    getByExternalId: (externalId: string) => Promise<Project | null>;
    clearAll: () => Promise<ClearDataResult>;
    getAvailableDetailFields: () => Promise<string[]>;
    getDetailSyncDiagnostics: () => Promise<ProjectDetailDiagnostics>;
  };

  // Opportunities
  opportunities: {
    getAll: (options?: OpportunityQueryOptions) => Promise<Opportunity[]>;
    getById: (id: number) => Promise<Opportunity | null>;
    getByExternalId: (externalId: string) => Promise<Opportunity | null>;
    getStages: () => Promise<string[]>;
    getSalesReps: () => Promise<string[]>;
    clearAll: () => Promise<ClearDataResult>;
  };

  // Service Tickets
  serviceTickets: {
    getAll: (options?: ServiceTicketQueryOptions) => Promise<ServiceTicket[]>;
    getById: (id: number) => Promise<ServiceTicket | null>;
    getByExternalId: (externalId: string) => Promise<ServiceTicket | null>;
    getStatuses: () => Promise<string[]>;
    getPriorities: () => Promise<string[]>;
    getAssignees: () => Promise<string[]>;
    getCompanies: () => Promise<string[]>;
    getBoards: () => Promise<string[]>;
    clearAll: () => Promise<ClearDataResult>;
  };

  // Sync
  sync: {
    request: (syncType: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'ALL') => Promise<SyncRequestResult>;
    getStatus: () => Promise<SyncStatus>;
    getHistory: (options?: SyncHistoryOptions) => Promise<SyncHistory[]>;
    getChanges: (syncHistoryId: number) => Promise<EntityChangeSummary[]>;
    cancel: (syncId: number) => Promise<void>;
    clearHistory: () => Promise<ClearHistoryResult>;
  };

  // ATOM Feeds
  feeds: {
    getAll: () => Promise<AtomFeed[]>;
    import: (filePath: string) => Promise<AtomFeed[]>;
    importFromDialog: () => Promise<AtomFeed[]>;
    delete: (feedId: number) => Promise<void>;
    test: (feedId: number) => Promise<FeedTestResult>;
    update: (feedId: number, updates: { name?: string; feedType?: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' }) => Promise<AtomFeed | null>;
    linkDetail: (summaryFeedId: number, detailFeedId: number) => Promise<AtomFeed | null>;
    unlinkDetail: (summaryFeedId: number) => Promise<AtomFeed | null>;
    getDetailFeeds: () => Promise<AtomFeed[]>;
    getDetailSyncDiagnostics: () => Promise<FeedDetailDiagnostics>;
  };

  // Settings
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    getAll: () => Promise<Record<string, string>>;
  };

  // Updates
  updates: {
    check: () => Promise<UpdateCheckResult>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    setGitHubToken: (token: string | null) => Promise<void>;
    getGitHubTokenStatus: () => Promise<GitHubTokenStatus>;
  };

  // Events (main -> renderer)
  on: (channel: string, callback: (data: unknown) => void) => () => void;
  off: (channel: string, callback: (data: unknown) => void) => void;

  // App info
  getVersion: () => Promise<string>;
  getPlatform: () => NodeJS.Platform;
}

// Type definitions (these should match your existing types)
interface ProjectQueryOptions {
  status?: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

interface OpportunityQueryOptions {
  stage?: string;
  salesRep?: string;
  limit?: number;
  offset?: number;
}

interface ServiceTicketQueryOptions {
  status?: string;
  priority?: string;
  assignedTo?: string;
  companyName?: string;
  boardName?: string;
  limit?: number;
  offset?: number;
}

interface Project {
  id: number;
  externalId: string;
  clientName: string;
  projectName: string;
  budget: number | null;
  spent: number | null;
  hoursEstimate: number | null;
  hoursRemaining: number | null;
  status: string;
  isActive: boolean;
  notes: string | null;
  rawData: string | null;
  detailRawData: string | null;
  createdAt: string;
  updatedAt: string;
  budgetRemaining?: number;
  budgetPercentUsed?: number;
}

interface Opportunity {
  id: number;
  externalId: string;
  opportunityName: string;
  companyName: string;
  salesRep: string;
  stage: string;
  expectedRevenue: number | null;
  closeDate: string | null;
  probability: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  weightedValue?: number;
}

interface ServiceTicket {
  id: number;
  externalId: string;
  summary: string | null;
  status: string | null;
  priority: string | null;
  assignedTo: string | null;
  companyName: string | null;
  boardName: string | null;
  createdDate: string | null;
  lastUpdated: string | null;
  dueDate: string | null;
  hoursEstimate: number | null;
  hoursActual: number | null;
  hoursRemaining: number | null;
  budget: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SyncHistory {
  id: number;
  syncType: string;
  status: string;
  triggeredBy: string;
  startedAt: string | null;
  completedAt: string | null;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsUnchanged: number;
  errorMessage: string | null;
  createdAt: string;
}

interface SyncStatus {
  projects: { lastSync: string | null; lastSyncId: number | null; recordsSynced: number };
  opportunities: { lastSync: string | null; lastSyncId: number | null; recordsSynced: number };
  serviceTickets: { lastSync: string | null; lastSyncId: number | null; recordsSynced: number };
  pendingSyncs: Array<{ id: number; syncType: string; status: string }>;
}

interface SyncRequestResult {
  ids: number[];
  message: string;
}

interface SyncHistoryOptions {
  syncType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

interface EntityChangeSummary {
  entityType: string;
  entityId: number;
  externalId: string;
  changeType: string;
  fieldChanges: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }>;
}

interface ClearHistoryResult {
  message: string;
  deletedHistory: number;
  deletedChanges: number;
}

interface ClearDataResult {
  deleted: number;
}

interface AtomFeed {
  id: number;
  name: string;
  feedType: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL';
  feedUrl: string;
  detailFeedId: number | null;
  lastSync: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedTestResult {
  success: boolean;
  recordCount?: number;
  error?: string;
}

interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  releaseNotes?: string;
}

interface GitHubTokenStatus {
  hasToken: boolean;
  maskedToken: string | null;
}

interface ProjectDetailDiagnostics {
  projectsWithDetailData: number;
  totalProjects: number;
  sampleExternalIds: string[];
  sampleDetailData: { externalId: string; fieldCount: number; fields: string[] } | null;
}

interface FeedDetailDiagnostics {
  adaptiveSyncEnabled: boolean;
  projectsFeeds: { id: number; name: string; isActive: boolean; hasDetailLink: boolean; detailFeedId: number | null }[];
  detailFeeds: { id: number; name: string; isActive: boolean; feedUrl: string }[];
  linkedPairs: { projectsFeedId: number; projectsFeedName: string; detailFeedId: number; detailFeedName: string }[];
}

// Valid channels for events from main process
const validEventChannels = [
  'sync:progress',
  'sync:completed',
  'sync:failed',
  'update:checking',
  'update:available',
  'update:not-available',
  'update:downloading',
  'update:progress',
  'update:downloaded',
  'update:error',
  'feed:sync-started',
  'feed:sync-completed',
];

// Expose protected methods via context bridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Projects
  projects: {
    getAll: (options?: ProjectQueryOptions) => ipcRenderer.invoke('projects:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('projects:getById', id),
    getByExternalId: (externalId: string) => ipcRenderer.invoke('projects:getByExternalId', externalId),
    getStatuses: () => ipcRenderer.invoke('projects:getStatuses'),
    clearAll: () => ipcRenderer.invoke('projects:clearAll'),
    getAvailableDetailFields: () => ipcRenderer.invoke('projects:getAvailableDetailFields'),
    getDetailSyncDiagnostics: () => ipcRenderer.invoke('projects:getDetailSyncDiagnostics'),
  },

  // Opportunities
  opportunities: {
    getAll: (options?: OpportunityQueryOptions) => ipcRenderer.invoke('opportunities:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('opportunities:getById', id),
    getByExternalId: (externalId: string) => ipcRenderer.invoke('opportunities:getByExternalId', externalId),
    getStages: () => ipcRenderer.invoke('opportunities:getStages'),
    getSalesReps: () => ipcRenderer.invoke('opportunities:getSalesReps'),
    clearAll: () => ipcRenderer.invoke('opportunities:clearAll'),
  },

  // Service Tickets
  serviceTickets: {
    getAll: (options?: ServiceTicketQueryOptions) => ipcRenderer.invoke('serviceTickets:getAll', options),
    getById: (id: number) => ipcRenderer.invoke('serviceTickets:getById', id),
    getByExternalId: (externalId: string) => ipcRenderer.invoke('serviceTickets:getByExternalId', externalId),
    getStatuses: () => ipcRenderer.invoke('serviceTickets:getStatuses'),
    getPriorities: () => ipcRenderer.invoke('serviceTickets:getPriorities'),
    getAssignees: () => ipcRenderer.invoke('serviceTickets:getAssignees'),
    getCompanies: () => ipcRenderer.invoke('serviceTickets:getCompanies'),
    getBoards: () => ipcRenderer.invoke('serviceTickets:getBoards'),
    clearAll: () => ipcRenderer.invoke('serviceTickets:clearAll'),
  },

  // Sync
  sync: {
    request: (syncType: string) => ipcRenderer.invoke('sync:request', syncType),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    getHistory: (options?: SyncHistoryOptions) => ipcRenderer.invoke('sync:getHistory', options),
    getChanges: (syncHistoryId: number) => ipcRenderer.invoke('sync:getChanges', syncHistoryId),
    cancel: (syncId: number) => ipcRenderer.invoke('sync:cancel', syncId),
    clearHistory: () => ipcRenderer.invoke('sync:clearHistory'),
  },

  // ATOM Feeds
  feeds: {
    getAll: () => ipcRenderer.invoke('feeds:getAll'),
    import: (filePath: string) => ipcRenderer.invoke('feeds:import', filePath),
    importFromDialog: () => ipcRenderer.invoke('feeds:importFromDialog'),
    delete: (feedId: number) => ipcRenderer.invoke('feeds:delete', feedId),
    test: (feedId: number) => ipcRenderer.invoke('feeds:test', feedId),
    update: (feedId: number, updates: { name?: string; feedType?: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' }) => ipcRenderer.invoke('feeds:update', feedId, updates),
    linkDetail: (summaryFeedId: number, detailFeedId: number) => ipcRenderer.invoke('feeds:linkDetail', summaryFeedId, detailFeedId),
    unlinkDetail: (summaryFeedId: number) => ipcRenderer.invoke('feeds:unlinkDetail', summaryFeedId),
    getDetailFeeds: () => ipcRenderer.invoke('feeds:getDetailFeeds'),
    getDetailSyncDiagnostics: () => ipcRenderer.invoke('feeds:getDetailSyncDiagnostics'),
  },

  // Settings
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // Updates
  updates: {
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    setGitHubToken: (token: string | null) => ipcRenderer.invoke('updates:setGitHubToken', token),
    getGitHubTokenStatus: () => ipcRenderer.invoke('updates:getGitHubTokenStatus'),
  },

  // Event subscription
  on: (channel: string, callback: (data: unknown) => void) => {
    if (!validEventChannels.includes(channel)) {
      console.warn(`Invalid event channel: ${channel}`);
      return () => {};
    }

    const subscription = (_event: IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on(channel, subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener(channel, subscription);
    };
  },

  off: (channel: string, callback: (data: unknown) => void) => {
    if (validEventChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback as never);
    }
  },

  // App info
  getVersion: () => ipcRenderer.invoke('updates:getVersion'),
  getPlatform: () => process.platform,
} as ElectronAPI);

// Extend Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
