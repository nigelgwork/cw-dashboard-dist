/**
 * Employee Service
 *
 * Manages employee data in the cloud database.
 */

import { query, queryOne, execute, isConnected } from './cloud-database';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  color: string;
  avatarUrl: string | null;
  isSenior: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeRow {
  id: number;
  first_name: string;
  last_name: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  color: string;
  avatar_url: string | null;
  is_senior: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeQueryOptions {
  isActive?: boolean;
  department?: string;
  limit?: number;
  offset?: number;
}

export interface CreateEmployeeData {
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  role?: string;
  department?: string;
  color?: string;
  avatarUrl?: string;
  isSenior?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

function transformRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    department: row.department,
    color: row.color || '#6366F1',
    avatarUrl: row.avatar_url,
    isSenior: row.is_senior,
    isActive: row.is_active,
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
 * Get all employees with optional filtering
 */
export async function getAll(options: EmployeeQueryOptions = {}): Promise<Employee[]> {
  ensureConnected();

  const { isActive, department, limit = 500, offset = 0 } = options;

  let sql = 'SELECT * FROM employees WHERE 1=1';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (isActive !== undefined) {
    sql += ` AND is_active = $${paramIndex++}`;
    params.push(isActive);
  }

  if (department) {
    sql += ` AND department = $${paramIndex++}`;
    params.push(department);
  }

  sql += ` ORDER BY sort_order, last_name, first_name LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const rows = await query<EmployeeRow>(sql, params);
  return rows.map(transformRow);
}

/**
 * Get employee by ID
 */
export async function getById(id: number): Promise<Employee | null> {
  ensureConnected();

  const row = await queryOne<EmployeeRow>('SELECT * FROM employees WHERE id = $1', [id]);
  return row ? transformRow(row) : null;
}

/**
 * Create a new employee
 */
export async function create(data: CreateEmployeeData): Promise<Employee> {
  ensureConnected();

  const displayName = data.displayName || `${data.firstName} ${data.lastName}`;

  const sql = `
    INSERT INTO employees (
      first_name, last_name, display_name, email, role, department,
      color, avatar_url, is_senior, is_active, sort_order
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const params = [
    data.firstName,
    data.lastName,
    displayName,
    data.email ?? null,
    data.role ?? null,
    data.department ?? null,
    data.color ?? '#6366F1',
    data.avatarUrl ?? null,
    data.isSenior ?? false,
    data.isActive ?? true,
    data.sortOrder ?? 0,
  ];

  const rows = await query<EmployeeRow>(sql, params);
  return transformRow(rows[0]);
}

/**
 * Update an employee
 */
export async function update(id: number, data: Partial<CreateEmployeeData>): Promise<Employee | null> {
  ensureConnected();

  const existing = await getById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.firstName !== undefined) {
    updates.push(`first_name = $${paramIndex++}`);
    params.push(data.firstName);
  }
  if (data.lastName !== undefined) {
    updates.push(`last_name = $${paramIndex++}`);
    params.push(data.lastName);
  }
  if (data.displayName !== undefined) {
    updates.push(`display_name = $${paramIndex++}`);
    params.push(data.displayName);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    params.push(data.email);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramIndex++}`);
    params.push(data.role);
  }
  if (data.department !== undefined) {
    updates.push(`department = $${paramIndex++}`);
    params.push(data.department);
  }
  if (data.color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    params.push(data.color);
  }
  if (data.avatarUrl !== undefined) {
    updates.push(`avatar_url = $${paramIndex++}`);
    params.push(data.avatarUrl);
  }
  if (data.isSenior !== undefined) {
    updates.push(`is_senior = $${paramIndex++}`);
    params.push(data.isSenior);
  }
  if (data.isActive !== undefined) {
    updates.push(`is_active = $${paramIndex++}`);
    params.push(data.isActive);
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

  const sql = `UPDATE employees SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  const rows = await query<EmployeeRow>(sql, params);

  return rows.length > 0 ? transformRow(rows[0]) : null;
}

/**
 * Delete an employee
 */
export async function deleteEmployee(id: number): Promise<boolean> {
  ensureConnected();

  const count = await execute('DELETE FROM employees WHERE id = $1', [id]);
  return count > 0;
}

/**
 * Get distinct departments
 */
export async function getDepartments(): Promise<string[]> {
  ensureConnected();

  const rows = await query<{ department: string }>(
    'SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department'
  );
  return rows.map((r) => r.department);
}

/**
 * Reorder employees (update sort_order)
 */
export async function reorder(orderedIds: number[]): Promise<void> {
  ensureConnected();

  for (let i = 0; i < orderedIds.length; i++) {
    await execute('UPDATE employees SET sort_order = $1, updated_at = NOW() WHERE id = $2', [i, orderedIds[i]]);
  }
}

/**
 * Get employee count
 */
export async function getCount(isActive?: boolean): Promise<number> {
  ensureConnected();

  let sql = 'SELECT COUNT(*) as count FROM employees';
  const params: unknown[] = [];

  if (isActive !== undefined) {
    sql += ' WHERE is_active = $1';
    params.push(isActive);
  }

  const row = await queryOne<{ count: string }>(sql, params);
  return row ? parseInt(row.count, 10) : 0;
}
