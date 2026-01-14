import api from './client';
import { ServiceTicket, ServiceTicketAPI, transformServiceTicket } from '../types';
import { PaginatedResponse } from './projects';

export interface ServiceTicketsFilter {
  status?: string;
  priority?: string;
  assignedTo?: string;
  companyName?: string;
  boardName?: string;
  skip?: number;
  limit?: number;
}

export const serviceTicketsApi = {
  getAll: async (filters: ServiceTicketsFilter = {}): Promise<ServiceTicket[]> => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.assignedTo) params.assigned_to = filters.assignedTo;
    if (filters.companyName) params.company_name = filters.companyName;
    if (filters.boardName) params.board_name = filters.boardName;
    if (filters.skip !== undefined) params.skip = String(filters.skip);
    if (filters.limit !== undefined) params.limit = String(filters.limit);

    const response = await api.get<PaginatedResponse<ServiceTicketAPI>>(
      '/service-tickets',
      Object.keys(params).length > 0 ? params : undefined
    );
    return response.items.map(transformServiceTicket);
  },

  getAllPaginated: async (filters: ServiceTicketsFilter = {}): Promise<PaginatedResponse<ServiceTicket>> => {
    const params: Record<string, string> = {};
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.assignedTo) params.assigned_to = filters.assignedTo;
    if (filters.companyName) params.company_name = filters.companyName;
    if (filters.boardName) params.board_name = filters.boardName;
    if (filters.skip !== undefined) params.skip = String(filters.skip);
    if (filters.limit !== undefined) params.limit = String(filters.limit);

    const response = await api.get<PaginatedResponse<ServiceTicketAPI>>(
      '/service-tickets',
      Object.keys(params).length > 0 ? params : undefined
    );

    return {
      ...response,
      items: response.items.map(transformServiceTicket),
    };
  },

  getById: async (id: number): Promise<ServiceTicket> => {
    const data = await api.get<ServiceTicketAPI>(`/service-tickets/${id}`);
    return transformServiceTicket(data);
  },

  getByExternalId: async (externalId: string): Promise<ServiceTicket> => {
    const data = await api.get<ServiceTicketAPI>(`/service-tickets/external/${externalId}`);
    return transformServiceTicket(data);
  },

  getStatuses: async (): Promise<string[]> => {
    return api.get<string[]>('/service-tickets/statuses');
  },

  getPriorities: async (): Promise<string[]> => {
    return api.get<string[]>('/service-tickets/priorities');
  },

  getAssignees: async (): Promise<string[]> => {
    return api.get<string[]>('/service-tickets/assignees');
  },

  getCompanies: async (): Promise<string[]> => {
    return api.get<string[]>('/service-tickets/companies');
  },

  getBoards: async (): Promise<string[]> => {
    return api.get<string[]>('/service-tickets/boards');
  },
};
