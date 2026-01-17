/**
 * API Module - Unified export for frontend API access
 *
 * Automatically selects between Electron IPC and HTTP based on the environment.
 */

import { projectsApi, getSyncStatus } from './projects';
import { opportunitiesApi } from './opportunities';
import { serviceTicketsApi } from './service-tickets';
import { syncApi } from './sync';
import {
  isElectron,
  electronProjectsApi,
  electronOpportunitiesApi,
  electronServiceTicketsApi,
  electronSyncApi,
  electronFeedsApi,
  electronSettingsApi,
  electronUpdatesApi,
  electronEvents,
} from './electron-api';
import { cloudApi } from './cloud';
import { employeesApi } from './employees';
import { quotationsApi } from './quotations';
import { resourceTasksApi } from './resource-tasks';
import { teamsApi } from './teams';

// Re-export types
export type { ProjectsFilter, PaginatedResponse } from './projects';
export type { OpportunitiesFilter } from './opportunities';
export type { ServiceTicketsFilter } from './service-tickets';
export type {
  AtomFeed,
  FeedTestResult,
  Setting,
  UpdateCheckResult,
  SyncRequestResult,
  ClearHistoryResult,
} from './electron-api';

// Determine which API to use
const useElectron = isElectron();

// Export the appropriate API implementations
export const projects = useElectron ? electronProjectsApi : projectsApi;
export const opportunities = useElectron ? electronOpportunitiesApi : opportunitiesApi;
export const serviceTickets = useElectron ? electronServiceTicketsApi : serviceTicketsApi;
export const sync = useElectron ? electronSyncApi : syncApi;

// Electron-only APIs (null when running in browser)
export const feeds = useElectron ? electronFeedsApi : null;
export const settings = useElectron ? electronSettingsApi : null;
export const updates = useElectron ? electronUpdatesApi : null;
export const events = useElectron ? electronEvents : null;

// Cloud-only APIs (require cloud database connection)
export const cloud = useElectron ? cloudApi : null;
export const employees = useElectron ? employeesApi : null;
export const quotations = useElectron ? quotationsApi : null;
export const resourceTasks = useElectron ? resourceTasksApi : null;
export const teams = useElectron ? teamsApi : null;

// Legacy export for backward compatibility
export { getSyncStatus };

// Export environment detection
export { isElectron };

// Default export for convenience
const api = {
  projects,
  opportunities,
  serviceTickets,
  sync,
  feeds,
  settings,
  updates,
  events,
  cloud,
  employees,
  quotations,
  resourceTasks,
  teams,
  isElectron: useElectron,
};

export default api;
