/**
 * Quotations API
 *
 * Manages quotation/proposal data in the cloud database.
 */

import { isElectron } from './electron-api';
import type {
  Quotation,
  QuotationQueryOptions,
  CreateQuotationData,
  QuotationStatus,
  Priority,
  QuotationStats,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElectronAPI(): any {
  if (!isElectron()) {
    throw new Error('Quotations API is only available in Electron mode');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI;
}

export const quotationsApi = {
  /**
   * Get all quotations with optional filtering
   */
  getAll: async (options?: QuotationQueryOptions): Promise<Quotation[]> => {
    const api = getElectronAPI();
    return api.quotations.getAll(options);
  },

  /**
   * Get quotation by ID
   */
  getById: async (id: number): Promise<Quotation | null> => {
    const api = getElectronAPI();
    return api.quotations.getById(id);
  },

  /**
   * Create a new quotation
   */
  create: async (data: CreateQuotationData): Promise<Quotation> => {
    const api = getElectronAPI();
    return api.quotations.create(data);
  },

  /**
   * Update a quotation
   */
  update: async (id: number, data: Partial<CreateQuotationData>): Promise<Quotation | null> => {
    const api = getElectronAPI();
    return api.quotations.update(id, data);
  },

  /**
   * Delete a quotation
   */
  delete: async (id: number): Promise<boolean> => {
    const api = getElectronAPI();
    return api.quotations.delete(id);
  },

  /**
   * Get available statuses
   */
  getStatuses: async (): Promise<QuotationStatus[]> => {
    const api = getElectronAPI();
    return api.quotations.getStatuses();
  },

  /**
   * Get available priorities
   */
  getPriorities: async (): Promise<Priority[]> => {
    const api = getElectronAPI();
    return api.quotations.getPriorities();
  },

  /**
   * Get quotation statistics
   */
  getStats: async (): Promise<QuotationStats> => {
    const api = getElectronAPI();
    return api.quotations.getStats();
  },
};
