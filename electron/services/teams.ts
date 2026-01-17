/**
 * Teams Service
 *
 * Manages team data and team membership in the cloud database.
 */

import { query, queryOne, execute, isConnected } from './cloud-database';

export interface Team {
  id: number;
  name: string;
  color: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  memberCount?: number;
  createdAt: string;
}

interface TeamRow {
  id: number;
  name: string;
  color: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  member_count?: string;
  created_at: string;
}

export interface TeamMember {
  id: number;
  teamId: number;
  employeeId: number;
  isLead: boolean;
  employeeName?: string;
  employeeRole?: string;
}

interface TeamMemberRow {
  id: number;
  team_id: number;
  employee_id: number;
  is_lead: boolean;
  employee_name?: string;
  employee_role?: string;
}

export interface TeamQueryOptions {
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateTeamData {
  name: string;
  color?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

function transformTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#3B82F6',
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    memberCount: row.member_count ? parseInt(row.member_count, 10) : 0,
    createdAt: row.created_at,
  };
}

function transformMemberRow(row: TeamMemberRow): TeamMember {
  return {
    id: row.id,
    teamId: row.team_id,
    employeeId: row.employee_id,
    isLead: row.is_lead,
    employeeName: row.employee_name,
    employeeRole: row.employee_role,
  };
}

function ensureConnected(): void {
  if (!isConnected()) {
    throw new Error('Cloud database not connected');
  }
}

/**
 * Get all teams with optional filtering
 */
export async function getAll(options: TeamQueryOptions = {}): Promise<Team[]> {
  ensureConnected();

  const { isActive, limit = 100, offset = 0 } = options;

  let sql = `
    SELECT t.*, COUNT(tm.id) as member_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (isActive !== undefined) {
    sql += ` AND t.is_active = $${paramIndex++}`;
    params.push(isActive);
  }

  sql += ` GROUP BY t.id ORDER BY t.sort_order, t.name LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const rows = await query<TeamRow>(sql, params);
  return rows.map(transformTeamRow);
}

/**
 * Get team by ID
 */
export async function getById(id: number): Promise<Team | null> {
  ensureConnected();

  const row = await queryOne<TeamRow>(`
    SELECT t.*, COUNT(tm.id) as member_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.id = $1
    GROUP BY t.id
  `, [id]);

  return row ? transformTeamRow(row) : null;
}

/**
 * Create a new team
 */
export async function create(data: CreateTeamData): Promise<Team> {
  ensureConnected();

  const sql = `
    INSERT INTO teams (name, color, description, sort_order, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;

  const params = [
    data.name,
    data.color ?? '#3B82F6',
    data.description ?? null,
    data.sortOrder ?? 0,
    data.isActive ?? true,
  ];

  const rows = await query<TeamRow>(sql, params);
  return transformTeamRow(rows[0]);
}

/**
 * Update a team
 */
export async function update(id: number, data: Partial<CreateTeamData>): Promise<Team | null> {
  ensureConnected();

  const existing = await getById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(data.name);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    params.push(data.color);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(data.description);
  }
  if (data.sortOrder !== undefined) {
    updates.push(`sort_order = $${paramIndex++}`);
    params.push(data.sortOrder);
  }
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(data.isActive);
  }

  if (updates.length === 0) {
    return existing;
  }

  params.push(id);
  const sql = `UPDATE teams SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
  await execute(sql, params);

  return getById(id);
}

/**
 * Delete a team
 */
export async function deleteTeam(id: number): Promise<boolean> {
  ensureConnected();

  const count = await execute('DELETE FROM teams WHERE id = $1', [id]);
  return count > 0;
}

/**
 * Get team members
 */
export async function getMembers(teamId: number): Promise<TeamMember[]> {
  ensureConnected();

  const sql = `
    SELECT tm.*, e.display_name as employee_name, e.role as employee_role
    FROM team_members tm
    JOIN employees e ON tm.employee_id = e.id
    WHERE tm.team_id = $1
    ORDER BY tm.is_lead DESC, e.display_name
  `;

  const rows = await query<TeamMemberRow>(sql, [teamId]);
  return rows.map(transformMemberRow);
}

/**
 * Add member to team
 */
export async function addMember(teamId: number, employeeId: number, isLead = false): Promise<TeamMember> {
  ensureConnected();

  // Check if already a member
  const existing = await queryOne<TeamMemberRow>(
    'SELECT * FROM team_members WHERE team_id = $1 AND employee_id = $2',
    [teamId, employeeId]
  );

  if (existing) {
    // Update is_lead if different
    if (existing.is_lead !== isLead) {
      await execute(
        'UPDATE team_members SET is_lead = $1 WHERE id = $2',
        [isLead, existing.id]
      );
    }
    return transformMemberRow({ ...existing, is_lead: isLead });
  }

  const sql = `
    INSERT INTO team_members (team_id, employee_id, is_lead)
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  const rows = await query<TeamMemberRow>(sql, [teamId, employeeId, isLead]);
  return transformMemberRow(rows[0]);
}

/**
 * Remove member from team
 */
export async function removeMember(teamId: number, employeeId: number): Promise<boolean> {
  ensureConnected();

  const count = await execute(
    'DELETE FROM team_members WHERE team_id = $1 AND employee_id = $2',
    [teamId, employeeId]
  );
  return count > 0;
}

/**
 * Set team lead
 */
export async function setLead(teamId: number, employeeId: number): Promise<void> {
  ensureConnected();

  // Remove lead status from all current members
  await execute(
    'UPDATE team_members SET is_lead = FALSE WHERE team_id = $1',
    [teamId]
  );

  // Set new lead
  await execute(
    'UPDATE team_members SET is_lead = TRUE WHERE team_id = $1 AND employee_id = $2',
    [teamId, employeeId]
  );
}

/**
 * Get teams for an employee
 */
export async function getTeamsForEmployee(employeeId: number): Promise<Team[]> {
  ensureConnected();

  const sql = `
    SELECT t.*, COUNT(tm2.id) as member_count
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN team_members tm2 ON t.id = tm2.team_id
    WHERE tm.employee_id = $1
    GROUP BY t.id
    ORDER BY t.sort_order, t.name
  `;

  const rows = await query<TeamRow>(sql, [employeeId]);
  return rows.map(transformTeamRow);
}

/**
 * Reorder teams
 */
export async function reorder(orderedIds: number[]): Promise<void> {
  ensureConnected();

  for (let i = 0; i < orderedIds.length; i++) {
    await execute('UPDATE teams SET sort_order = $1 WHERE id = $2', [i, orderedIds[i]]);
  }
}

/**
 * Get team count
 */
export async function getCount(isActive?: boolean): Promise<number> {
  ensureConnected();

  let sql = 'SELECT COUNT(*) as count FROM teams';
  const params: unknown[] = [];

  if (isActive !== undefined) {
    sql += ' WHERE is_active = $1';
    params.push(isActive);
  }

  const row = await queryOne<{ count: string }>(sql, params);
  return row ? parseInt(row.count, 10) : 0;
}
