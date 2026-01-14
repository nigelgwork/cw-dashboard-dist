import api from './client';
import {
  SyncHistory,
  SyncHistoryAPI,
  SyncChangeAPI,
  SyncStatusSummary,
  SyncStatusSummaryAPI,
  SyncType,
  EntityChangeSummary,
  transformSyncHistory,
  transformSyncChange,
  transformSyncStatusSummary,
} from '../types';

export interface SyncHistoryFilter {
  syncType?: SyncType;
  status?: string;
  limit?: number;
  offset?: number;
}

interface SyncChangesGroupedAPI {
  sync_history_id: number;
  entities: Array<{
    entity_type: string;
    entity_id: number;
    external_id?: string;
    change_type: string;
    field_changes: SyncChangeAPI[];
  }>;
}

export const syncApi = {
  /**
   * Get sync history with optional filtering
   */
  getHistory: async (filters: SyncHistoryFilter = {}): Promise<SyncHistory[]> => {
    const params: Record<string, string> = {};
    if (filters.syncType) params.sync_type = filters.syncType;
    if (filters.status) params.status = filters.status;
    if (filters.limit !== undefined) params.limit = String(filters.limit);
    if (filters.offset !== undefined) params.offset = String(filters.offset);

    const response = await api.get<SyncHistoryAPI[]>(
      '/sync/history',
      Object.keys(params).length > 0 ? params : undefined
    );
    return response.map(transformSyncHistory);
  },

  /**
   * Get a specific sync history record
   */
  getById: async (id: number): Promise<SyncHistory> => {
    const data = await api.get<SyncHistoryAPI>(`/sync/history/${id}`);
    return transformSyncHistory(data);
  },

  /**
   * Get field-level changes for a sync, grouped by entity
   */
  getChanges: async (syncHistoryId: number): Promise<EntityChangeSummary[]> => {
    const response = await api.get<SyncChangesGroupedAPI>(`/sync/history/${syncHistoryId}/changes`);
    return response.entities.map(entity => ({
      entityType: entity.entity_type as 'PROJECT' | 'OPPORTUNITY',
      entityId: entity.entity_id,
      externalId: entity.external_id,
      changeType: entity.change_type as 'CREATED' | 'UPDATED',
      fieldChanges: entity.field_changes.map(transformSyncChange),
    }));
  },

  /**
   * Get current sync status summary
   */
  getStatus: async (): Promise<SyncStatusSummary> => {
    const data = await api.get<SyncStatusSummaryAPI>('/sync/status');
    return transformSyncStatusSummary(data);
  },

  /**
   * Request a new sync (manual trigger)
   */
  requestSync: async (syncType: SyncType | 'ALL'): Promise<{ ids: number[]; message: string }> => {
    return api.post<{ ids: number[]; message: string }>('/sync/request', { sync_type: syncType });
  },

  /**
   * Cancel a pending or running sync
   */
  cancelSync: async (syncId: number): Promise<{ message: string }> => {
    return api.post<{ message: string }>(`/sync/cancel/${syncId}`, {});
  },

  /**
   * Check if the sync listener is running
   */
  getListenerStatus: async (): Promise<{
    alive: boolean;
    last_heartbeat: string | null;
    age_seconds?: number;
    message: string;
  }> => {
    return api.get('/sync/listener-status');
  },

  /**
   * Clear all sync history
   */
  clearHistory: async (): Promise<{
    message: string;
    deleted_history: number;
    deleted_changes: number;
  }> => {
    return api.delete('/sync/history');
  },
};

export default syncApi;
