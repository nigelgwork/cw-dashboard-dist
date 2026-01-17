/**
 * Resource Tasks API
 *
 * Manages resource task assignments in the cloud database.
 */

import { isElectron } from './electron-api';
import type {
  ResourceTask,
  ResourceTaskQueryOptions,
  CreateResourceTaskData,
  TaskStatus,
  TaskPriority,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElectronAPI(): any {
  if (!isElectron()) {
    throw new Error('Resource Tasks API is only available in Electron mode');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI;
}

export const resourceTasksApi = {
  /**
   * Get all tasks with optional filtering
   */
  getAll: async (options?: ResourceTaskQueryOptions): Promise<ResourceTask[]> => {
    const api = getElectronAPI();
    return api.resourceTasks.getAll(options);
  },

  /**
   * Get task by ID
   */
  getById: async (id: number): Promise<ResourceTask | null> => {
    const api = getElectronAPI();
    return api.resourceTasks.getById(id);
  },

  /**
   * Get tasks by employee
   */
  getByEmployee: async (employeeId: number): Promise<ResourceTask[]> => {
    const api = getElectronAPI();
    return api.resourceTasks.getByEmployee(employeeId);
  },

  /**
   * Get unassigned tasks
   */
  getUnassigned: async (): Promise<ResourceTask[]> => {
    const api = getElectronAPI();
    return api.resourceTasks.getUnassigned();
  },

  /**
   * Create a new task
   */
  create: async (data: CreateResourceTaskData): Promise<ResourceTask> => {
    const api = getElectronAPI();
    return api.resourceTasks.create(data);
  },

  /**
   * Update a task
   */
  update: async (id: number, data: Partial<CreateResourceTaskData>): Promise<ResourceTask | null> => {
    const api = getElectronAPI();
    return api.resourceTasks.update(id, data);
  },

  /**
   * Delete a task
   */
  delete: async (id: number): Promise<boolean> => {
    const api = getElectronAPI();
    return api.resourceTasks.delete(id);
  },

  /**
   * Move task to a different employee
   */
  moveToEmployee: async (
    taskId: number,
    employeeId: number | null,
    sortOrder?: number
  ): Promise<ResourceTask | null> => {
    const api = getElectronAPI();
    return api.resourceTasks.moveToEmployee(taskId, employeeId, sortOrder);
  },

  /**
   * Reorder tasks for an employee
   */
  reorderForEmployee: async (employeeId: number | null, orderedIds: number[]): Promise<void> => {
    const api = getElectronAPI();
    return api.resourceTasks.reorderForEmployee(employeeId, orderedIds);
  },

  /**
   * Get available statuses
   */
  getStatuses: async (): Promise<TaskStatus[]> => {
    const api = getElectronAPI();
    return api.resourceTasks.getStatuses();
  },

  /**
   * Get available priorities
   */
  getPriorities: async (): Promise<TaskPriority[]> => {
    const api = getElectronAPI();
    return api.resourceTasks.getPriorities();
  },
};
