/**
 * Employees API
 *
 * Manages employee data in the cloud database.
 */

import { isElectron } from './electron-api';
import type { Employee, EmployeeQueryOptions, CreateEmployeeData } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElectronAPI(): any {
  if (!isElectron()) {
    throw new Error('Employees API is only available in Electron mode');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI;
}

export const employeesApi = {
  /**
   * Get all employees with optional filtering
   */
  getAll: async (options?: EmployeeQueryOptions): Promise<Employee[]> => {
    const api = getElectronAPI();
    return api.employees.getAll(options);
  },

  /**
   * Get employee by ID
   */
  getById: async (id: number): Promise<Employee | null> => {
    const api = getElectronAPI();
    return api.employees.getById(id);
  },

  /**
   * Create a new employee
   */
  create: async (data: CreateEmployeeData): Promise<Employee> => {
    const api = getElectronAPI();
    return api.employees.create(data);
  },

  /**
   * Update an employee
   */
  update: async (id: number, data: Partial<CreateEmployeeData>): Promise<Employee | null> => {
    const api = getElectronAPI();
    return api.employees.update(id, data);
  },

  /**
   * Delete an employee
   */
  delete: async (id: number): Promise<boolean> => {
    const api = getElectronAPI();
    return api.employees.delete(id);
  },

  /**
   * Get distinct departments
   */
  getDepartments: async (): Promise<string[]> => {
    const api = getElectronAPI();
    return api.employees.getDepartments();
  },

  /**
   * Reorder employees
   */
  reorder: async (orderedIds: number[]): Promise<void> => {
    const api = getElectronAPI();
    return api.employees.reorder(orderedIds);
  },

  /**
   * Get employee count
   */
  getCount: async (isActive?: boolean): Promise<number> => {
    const api = getElectronAPI();
    return api.employees.getCount(isActive);
  },
};
