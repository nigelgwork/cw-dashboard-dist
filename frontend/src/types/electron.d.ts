/**
 * Type declarations for the Electron API exposed via contextBridge
 */

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

interface SyncHistoryOptions {
  syncType?: string;
  status?: string;
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
  hoursActual: number | null;
  hoursRemaining: number | null;
  status: string;
  isActive: boolean;
  notes: string | null;
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
  pendingSyncs: Array<{ id: number; syncType: string; status: string }>;
}

interface SyncRequestResult {
  ids: number[];
  message: string;
}

interface ClearHistoryResult {
  message: string;
  deletedHistory: number;
  deletedChanges: number;
}

interface EntityChangeSummary {
  entityType: string;
  entityId: number;
  externalId: string;
  changeType: string;
  fieldChanges: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }>;
}

interface AtomFeed {
  id: number;
  name: string;
  feedType: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS';
  feedUrl: string;
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

interface Setting {
  key: string;
  value: string;
}

export interface ElectronAPI {
  projects: {
    getAll: (options?: ProjectQueryOptions) => Promise<Project[]>;
    getById: (id: number) => Promise<Project | null>;
    getByExternalId: (externalId: string) => Promise<Project | null>;
  };

  opportunities: {
    getAll: (options?: OpportunityQueryOptions) => Promise<Opportunity[]>;
    getById: (id: number) => Promise<Opportunity | null>;
    getByExternalId: (externalId: string) => Promise<Opportunity | null>;
    getStages: () => Promise<string[]>;
    getSalesReps: () => Promise<string[]>;
  };

  sync: {
    request: (syncType: 'PROJECTS' | 'OPPORTUNITIES' | 'ALL') => Promise<SyncRequestResult>;
    getStatus: () => Promise<SyncStatus>;
    getHistory: (options?: SyncHistoryOptions) => Promise<SyncHistory[]>;
    getChanges: (syncHistoryId: number) => Promise<EntityChangeSummary[]>;
    cancel: (syncId: number) => Promise<void>;
    clearHistory: () => Promise<ClearHistoryResult>;
  };

  feeds: {
    getAll: () => Promise<AtomFeed[]>;
    import: (filePath: string) => Promise<AtomFeed[]>;
    importFromDialog: () => Promise<AtomFeed[]>;
    delete: (feedId: number) => Promise<void>;
    test: (feedId: number) => Promise<FeedTestResult>;
  };

  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
    getAll: () => Promise<Setting[]>;
  };

  updates: {
    check: () => Promise<UpdateCheckResult>;
    download: () => Promise<void>;
    install: () => Promise<void>;
  };

  on: (channel: string, callback: (data: unknown) => void) => () => void;
  off: (channel: string, callback: (data: unknown) => void) => void;

  getVersion: () => Promise<string>;
  getPlatform: () => NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
