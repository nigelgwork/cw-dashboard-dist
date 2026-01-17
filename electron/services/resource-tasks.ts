/**
 * Resource Tasks Service
 *
 * Manages resource task assignments in the cloud database.
 */

import { query, queryOne, execute, isConnected } from './cloud-database';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ResourceTask {
  id: number;
  employeeId: number | null;
  employeeName?: string | null;
  projectExternalId: string | null;
  clientName: string | null;
  projectName: string | null;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  estimatedHours: number | null;
  percentComplete: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ResourceTaskRow {
  id: number;
  employee_id: number | null;
  employee_name?: string | null;
  project_external_id: string | null;
  client_name: string | null;
  project_name: string | null;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  estimated_hours: string | null;
  percent_complete: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ResourceTaskQueryOptions {
  employeeId?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  unassigned?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateResourceTaskData {
  employeeId?: number;
  projectExternalId?: string;
  clientName?: string;
  projectName?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  estimatedHours?: number;
  percentComplete?: number;
  sortOrder?: number;
}

function transformRow(row: ResourceTaskRow): ResourceTask {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    projectExternalId: row.project_external_id,
    clientName: row.client_name,
    projectName: row.project_name,
    description: row.description,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    dueDate: row.due_date,
    estimatedHours: row.estimated_hours ? parseFloat(row.estimated_hours) : null,
    percentComplete: row.percent_complete,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function ensureConnected(): void {
  if (!isConnected()) {
    throw new Error('Cloud database not connected');
  }
}

/**
 * Get all tasks with optional filtering
 */
export async function getAll(options: ResourceTaskQueryOptions = {}): Promise<ResourceTask[]> {
  ensureConnected();

  const { employeeId, status, priority, unassigned, limit = 500, offset = 0 } = options;

  let sql = `
    SELECT t.*, e.display_name as employee_name
    FROM resource_tasks t
    LEFT JOIN employees e ON t.employee_id = e.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (employeeId !== undefined) {
    sql += ` AND t.employee_id = $${paramIndex++}`;
    params.push(employeeId);
  }

  if (unassigned) {
    sql += ' AND t.employee_id IS NULL';
  }

  if (status) {
    sql += ` AND t.status = $${paramIndex++}`;
    params.push(status);
  }

  if (priority) {
    sql += ` AND t.priority = $${paramIndex++}`;
    params.push(priority);
  }

  sql += ` ORDER BY t.sort_order, t.created_at LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const rows = await query<ResourceTaskRow>(sql, params);
  return rows.map(transformRow);
}

/**
 * Get tasks by employee
 */
export async function getByEmployee(employeeId: number): Promise<ResourceTask[]> {
  ensureConnected();

  const sql = `
    SELECT t.*, e.display_name as employee_name
    FROM resource_tasks t
    LEFT JOIN employees e ON t.employee_id = e.id
    WHERE t.employee_id = $1
    ORDER BY t.sort_order, t.created_at
  `;

  const rows = await query<ResourceTaskRow>(sql, [employeeId]);
  return rows.map(transformRow);
}

/**
 * Get unassigned tasks
 */
export async function getUnassigned(): Promise<ResourceTask[]> {
  ensureConnected();

  const sql = `
    SELECT t.*, NULL as employee_name
    FROM resource_tasks t
    WHERE t.employee_id IS NULL
    ORDER BY t.sort_order, t.created_at
  `;

  const rows = await query<ResourceTaskRow>(sql);
  return rows.map(transformRow);
}

/**
 * Get task by ID
 */
export async function getById(id: number): Promise<ResourceTask | null> {
  ensureConnected();

  const row = await queryOne<ResourceTaskRow>(`
    SELECT t.*, e.display_name as employee_name
    FROM resource_tasks t
    LEFT JOIN employees e ON t.employee_id = e.id
    WHERE t.id = $1
  `, [id]);

  return row ? transformRow(row) : null;
}

/**
 * Create a new task
 */
export async function create(data: CreateResourceTaskData): Promise<ResourceTask> {
  ensureConnected();

  const sql = `
    INSERT INTO resource_tasks (
      employee_id, project_external_id, client_name, project_name,
      description, priority, status, due_date, estimated_hours,
      percent_complete, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const params = [
    data.employeeId ?? null,
    data.projectExternalId ?? null,
    data.clientName ?? null,
    data.projectName ?? null,
    data.description ?? null,
    data.priority ?? 'medium',
    data.status ?? 'todo',
    data.dueDate ?? null,
    data.estimatedHours ?? null,
    data.percentComplete ?? 0,
    data.sortOrder ?? 0,
  ];

  const rows = await query<ResourceTaskRow>(sql, params);
  const created = transformRow(rows[0]);

  // Fetch again to get employee_name
  return (await getById(created.id)) ?? created;
}

/**
 * Update a task
 */
export async function update(id: number, data: Partial<CreateResourceTaskData>): Promise<ResourceTask | null> {
  ensureConnected();

  const existing = await getById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.employeeId !== undefined) {
    updates.push(`employee_id = $${paramIndex++}`);
    params.push(data.employeeId);
  }
  if (data.projectExternalId !== undefined) {
    updates.push(`project_external_id = $${paramIndex++}`);
    params.push(data.projectExternalId);
  }
  if (data.clientName !== undefined) {
    updates.push(`client_name = $${paramIndex++}`);
    params.push(data.clientName);
  }
  if (data.projectName !== undefined) {
    updates.push(`project_name = $${paramIndex++}`);
    params.push(data.projectName);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(data.description);
  }
  if (data.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    params.push(data.priority);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  if (data.dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex++}`);
    params.push(data.dueDate);
  }
  if (data.estimatedHours !== undefined) {
    updates.push(`estimated_hours = $${paramIndex++}`);
    params.push(data.estimatedHours);
  }
  if (data.percentComplete !== undefined) {
    updates.push(`percent_complete = $${paramIndex++}`);
    params.push(data.percentComplete);
  }
  if (data.sortOrder !== undefined) {
    updates.push(`sort_order = $${paramIndex++}`);
    params.push(data.sortOrder);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE resource_tasks SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
  await execute(sql, params);

  return getById(id);
}

/**
 * Move task to a different employee
 */
export async function moveToEmployee(taskId: number, employeeId: number | null, sortOrder?: number): Promise<ResourceTask | null> {
  ensureConnected();

  const updates: Partial<CreateResourceTaskData> = {
    employeeId: employeeId ?? undefined,
  };

  if (sortOrder !== undefined) {
    updates.sortOrder = sortOrder;
  }

  return update(taskId, updates);
}

/**
 * Delete a task
 */
export async function deleteTask(id: number): Promise<boolean> {
  ensureConnected();

  const count = await execute('DELETE FROM resource_tasks WHERE id = $1', [id]);
  return count > 0;
}

/**
 * Reorder tasks for an employee
 */
export async function reorderForEmployee(employeeId: number | null, orderedIds: number[]): Promise<void> {
  ensureConnected();

  for (let i = 0; i < orderedIds.length; i++) {
    const whereClause = employeeId === null
      ? 'employee_id IS NULL'
      : `employee_id = ${employeeId}`;

    await execute(
      `UPDATE resource_tasks SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND ${whereClause}`,
      [i, orderedIds[i]]
    );
  }
}

/**
 * Get distinct statuses
 */
export function getStatuses(): TaskStatus[] {
  return ['todo', 'in_progress', 'review', 'done', 'blocked'];
}

/**
 * Get distinct priorities
 */
export function getPriorities(): TaskPriority[] {
  return ['low', 'medium', 'high', 'urgent'];
}

/**
 * Get task count
 */
export async function getCount(options: { employeeId?: number; status?: TaskStatus } = {}): Promise<number> {
  ensureConnected();

  let sql = 'SELECT COUNT(*) as count FROM resource_tasks WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.employeeId !== undefined) {
    sql += ` AND employee_id = $${paramIndex++}`;
    params.push(options.employeeId);
  }

  if (options.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(options.status);
  }

  const row = await queryOne<{ count: string }>(sql, params);
  return row ? parseInt(row.count, 10) : 0;
}
