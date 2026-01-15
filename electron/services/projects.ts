import { getDatabase } from '../database/connection';
import { ProjectRow } from '../database/schema';

export interface Project {
  id: number;
  externalId: string;
  clientName: string | null;
  projectName: string | null;
  budget: number | null;
  spent: number | null;
  hoursEstimate: number | null;
  hoursRemaining: number | null;
  status: string;
  isActive: boolean;
  notes: string | null;
  rawData: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  budgetRemaining: number | null;
  budgetPercentUsed: number | null;
}

export interface ProjectQueryOptions {
  status?: string;
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Transform database row to Project object
 */
function transformRow(row: ProjectRow): Project {
  const budget = row.budget;
  const spent = row.spent;

  return {
    id: row.id,
    externalId: row.external_id,
    clientName: row.client_name,
    projectName: row.project_name,
    budget: row.budget,
    spent: row.spent,
    hoursEstimate: row.hours_estimate,
    hoursRemaining: row.hours_remaining,
    status: row.status,
    isActive: row.is_active === 1,
    notes: row.notes,
    rawData: row.raw_data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Computed fields
    budgetRemaining: budget !== null && spent !== null ? budget - spent : null,
    budgetPercentUsed: budget !== null && budget > 0 && spent !== null ? (spent / budget) * 100 : null,
  };
}

/**
 * Get all projects with optional filtering
 */
export function getAll(options: ProjectQueryOptions = {}): Project[] {
  const db = getDatabase();
  const { status, includeInactive = false, limit = 500, offset = 0 } = options;

  let sql = 'SELECT * FROM projects WHERE 1=1';
  const params: (string | number)[] = [];

  if (!includeInactive) {
    sql += ' AND is_active = 1';
  }

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(sql).all(...params) as ProjectRow[];
  return rows.map(transformRow);
}

/**
 * Get a project by ID
 */
export function getById(id: number): Project | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  return row ? transformRow(row) : null;
}

/**
 * Get a project by external ID
 */
export function getByExternalId(externalId: string): Project | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM projects WHERE external_id = ?').get(externalId) as ProjectRow | undefined;
  return row ? transformRow(row) : null;
}

/**
 * Create or update a project (upsert)
 */
export function upsert(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'budgetRemaining' | 'budgetPercentUsed'>): Project {
  const db = getDatabase();

  const existing = getByExternalId(project.externalId);

  if (existing) {
    // Update
    db.prepare(`
      UPDATE projects SET
        client_name = ?,
        project_name = ?,
        budget = ?,
        spent = ?,
        hours_estimate = ?,
        hours_remaining = ?,
        status = ?,
        is_active = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE external_id = ?
    `).run(
      project.clientName,
      project.projectName,
      project.budget,
      project.spent,
      project.hoursEstimate,
      project.hoursRemaining,
      project.status,
      project.isActive ? 1 : 0,
      project.notes,
      project.externalId
    );

    return getByExternalId(project.externalId)!;
  } else {
    // Insert
    const result = db.prepare(`
      INSERT INTO projects (
        external_id, client_name, project_name, budget, spent,
        hours_estimate, hours_remaining, status, is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project.externalId,
      project.clientName,
      project.projectName,
      project.budget,
      project.spent,
      project.hoursEstimate,
      project.hoursRemaining,
      project.status,
      project.isActive ? 1 : 0,
      project.notes
    );

    return getById(result.lastInsertRowid as number)!;
  }
}

/**
 * Get distinct project statuses
 */
export function getStatuses(): string[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT DISTINCT status FROM projects WHERE status IS NOT NULL ORDER BY status').all() as { status: string }[];
  return rows.map((r) => r.status);
}

/**
 * Get project count
 */
export function getCount(includeInactive = false): number {
  const db = getDatabase();
  const sql = includeInactive
    ? 'SELECT COUNT(*) as count FROM projects'
    : 'SELECT COUNT(*) as count FROM projects WHERE is_active = 1';
  const row = db.prepare(sql).get() as { count: number };
  return row.count;
}

/**
 * Clear all projects from the database
 */
export function clearAll(): { deleted: number } {
  const db = getDatabase();
  const count = getCount(true);
  db.prepare('DELETE FROM projects').run();
  console.log(`[Projects] Cleared ${count} records`);
  return { deleted: count };
}
