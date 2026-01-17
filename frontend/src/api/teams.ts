/**
 * Teams API
 *
 * Manages team data and membership in the cloud database.
 */

import { isElectron } from './electron-api';
import type { Team, TeamQueryOptions, CreateTeamData, TeamMember } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getElectronAPI(): any {
  if (!isElectron()) {
    throw new Error('Teams API is only available in Electron mode');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI;
}

export const teamsApi = {
  /**
   * Get all teams with optional filtering
   */
  getAll: async (options?: TeamQueryOptions): Promise<Team[]> => {
    const api = getElectronAPI();
    return api.teams.getAll(options);
  },

  /**
   * Get team by ID
   */
  getById: async (id: number): Promise<Team | null> => {
    const api = getElectronAPI();
    return api.teams.getById(id);
  },

  /**
   * Create a new team
   */
  create: async (data: CreateTeamData): Promise<Team> => {
    const api = getElectronAPI();
    return api.teams.create(data);
  },

  /**
   * Update a team
   */
  update: async (id: number, data: Partial<CreateTeamData>): Promise<Team | null> => {
    const api = getElectronAPI();
    return api.teams.update(id, data);
  },

  /**
   * Delete a team
   */
  delete: async (id: number): Promise<boolean> => {
    const api = getElectronAPI();
    return api.teams.delete(id);
  },

  /**
   * Get team members
   */
  getMembers: async (teamId: number): Promise<TeamMember[]> => {
    const api = getElectronAPI();
    return api.teams.getMembers(teamId);
  },

  /**
   * Add member to team
   */
  addMember: async (teamId: number, employeeId: number, isLead?: boolean): Promise<TeamMember> => {
    const api = getElectronAPI();
    return api.teams.addMember(teamId, employeeId, isLead);
  },

  /**
   * Remove member from team
   */
  removeMember: async (teamId: number, employeeId: number): Promise<boolean> => {
    const api = getElectronAPI();
    return api.teams.removeMember(teamId, employeeId);
  },

  /**
   * Set team lead
   */
  setLead: async (teamId: number, employeeId: number): Promise<void> => {
    const api = getElectronAPI();
    return api.teams.setLead(teamId, employeeId);
  },

  /**
   * Get teams for an employee
   */
  getTeamsForEmployee: async (employeeId: number): Promise<Team[]> => {
    const api = getElectronAPI();
    return api.teams.getTeamsForEmployee(employeeId);
  },

  /**
   * Reorder teams
   */
  reorder: async (orderedIds: number[]): Promise<void> => {
    const api = getElectronAPI();
    return api.teams.reorder(orderedIds);
  },
};
