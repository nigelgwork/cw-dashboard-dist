import api from './client';
import { Project, ProjectAPI, transformProject } from '../types';

export interface SyncStatus {
  last_sync: string | null;
  project_count: number;
  opportunity_count: number;
  service_ticket_count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export interface ProjectsFilter {
  includeInactive?: boolean;
  status?: string;
  skip?: number;
  limit?: number;
}

export const getSyncStatus = async (): Promise<SyncStatus> => {
  return api.get<SyncStatus>('/sync-status');
};

export const projectsApi = {
  getAll: async (filters: ProjectsFilter = {}): Promise<Project[]> => {
    const params: Record<string, string> = {};
    if (filters.includeInactive) params.include_inactive = 'true';
    if (filters.status) params.status = filters.status;
    if (filters.skip !== undefined) params.skip = String(filters.skip);
    if (filters.limit !== undefined) params.limit = String(filters.limit);

    const response = await api.get<PaginatedResponse<ProjectAPI>>(
      '/projects',
      Object.keys(params).length > 0 ? params : undefined
    );
    return response.items.map(transformProject);
  },

  getAllPaginated: async (filters: ProjectsFilter = {}): Promise<PaginatedResponse<Project>> => {
    const params: Record<string, string> = {};
    if (filters.includeInactive) params.include_inactive = 'true';
    if (filters.status) params.status = filters.status;
    if (filters.skip !== undefined) params.skip = String(filters.skip);
    if (filters.limit !== undefined) params.limit = String(filters.limit);

    const response = await api.get<PaginatedResponse<ProjectAPI>>(
      '/projects',
      Object.keys(params).length > 0 ? params : undefined
    );

    return {
      ...response,
      items: response.items.map(transformProject),
    };
  },

  getById: async (id: number): Promise<Project> => {
    const data = await api.get<ProjectAPI>(`/projects/${id}`);
    return transformProject(data);
  },

  getByExternalId: async (externalId: string): Promise<Project> => {
    const data = await api.get<ProjectAPI>(`/projects/external/${externalId}`);
    return transformProject(data);
  },

  getStatuses: async (): Promise<string[]> => {
    // Web API - fetch statuses from backend
    const data = await api.get<string[]>('/projects/statuses');
    return data;
  },
};
