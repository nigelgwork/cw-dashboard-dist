/**
 * Cloud Database API
 *
 * Manages connection to cloud PostgreSQL database.
 */

import { isElectron } from './electron-api';
import type { CloudStatus, CloudTestResult } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElectronAPI(): any {
  if (!isElectron()) {
    throw new Error('Cloud API is only available in Electron mode');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI;
}

export const cloudApi = {
  /**
   * Get current cloud connection status
   */
  getStatus: async (): Promise<CloudStatus> => {
    const api = getElectronAPI();
    return api.cloud.getStatus();
  },

  /**
   * Test a connection string without connecting
   */
  testConnection: async (connectionString: string): Promise<CloudTestResult> => {
    const api = getElectronAPI();
    return api.cloud.testConnection(connectionString);
  },

  /**
   * Set the connection string (encrypted storage)
   */
  setConnectionString: async (connectionString: string): Promise<void> => {
    const api = getElectronAPI();
    return api.cloud.setConnectionString(connectionString);
  },

  /**
   * Connect to cloud database
   */
  connect: async (): Promise<boolean> => {
    const api = getElectronAPI();
    return api.cloud.connect();
  },

  /**
   * Disconnect from cloud database
   */
  disconnect: async (): Promise<void> => {
    const api = getElectronAPI();
    return api.cloud.disconnect();
  },

  /**
   * Enable or disable cloud database
   */
  setEnabled: async (enabled: boolean): Promise<void> => {
    const api = getElectronAPI();
    return api.cloud.setEnabled(enabled);
  },
};
