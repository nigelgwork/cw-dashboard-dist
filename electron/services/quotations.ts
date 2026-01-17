/**
 * Quotations Service
 *
 * Manages quotation/proposal data in the cloud database.
 */

import { query, queryOne, execute, isConnected } from './cloud-database';

export type QuotationStatus = 'draft' | 'sent' | 'follow_up' | 'won' | 'lost';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Quotation {
  id: number;
  reference: string | null;
  clientName: string;
  projectName: string | null;
  description: string | null;
  value: number | null;
  assignedTo: number | null;
  assignedToName?: string | null;
  status: QuotationStatus;
  priority: Priority;
  dueDate: string | null;
  sentDate: string | null;
  followUpDate: string | null;
  probability: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface QuotationRow {
  id: number;
  reference: string | null;
  client_name: string;
  project_name: string | null;
  description: string | null;
  value: string | null;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  sent_date: string | null;
  follow_up_date: string | null;
  probability: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationQueryOptions {
  status?: QuotationStatus;
  priority?: Priority;
  assignedTo?: number;
  limit?: number;
  offset?: number;
}

export interface CreateQuotationData {
  reference?: string;
  clientName: string;
  projectName?: string;
  description?: string;
  value?: number;
  assignedTo?: number;
  status?: QuotationStatus;
  priority?: Priority;
  dueDate?: string;
  sentDate?: string;
  followUpDate?: string;
  probability?: number;
  notes?: string;
}

function transformRow(row: QuotationRow): Quotation {
  return {
    id: row.id,
    reference: row.reference,
    clientName: row.client_name,
    projectName: row.project_name,
    description: row.description,
    value: row.value ? parseFloat(row.value) : null,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    status: row.status as QuotationStatus,
    priority: row.priority as Priority,
    dueDate: row.due_date,
    sentDate: row.sent_date,
    followUpDate: row.follow_up_date,
    probability: row.probability,
    notes: row.notes,
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
 * Get all quotations with optional filtering
 */
export async function getAll(options: QuotationQueryOptions = {}): Promise<Quotation[]> {
  ensureConnected();

  const { status, priority, assignedTo, limit = 500, offset = 0 } = options;

  let sql = `
    SELECT q.*, e.display_name as assigned_to_name
    FROM quotations q
    LEFT JOIN employees e ON q.assigned_to = e.id
    WHERE 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (status) {
    sql += ` AND q.status = $${paramIndex++}`;
    params.push(status);
  }

  if (priority) {
    sql += ` AND q.priority = $${paramIndex++}`;
    params.push(priority);
  }

  if (assignedTo) {
    sql += ` AND q.assigned_to = $${paramIndex++}`;
    params.push(assignedTo);
  }

  sql += ` ORDER BY q.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, offset);

  const rows = await query<QuotationRow>(sql, params);
  return rows.map(transformRow);
}

/**
 * Get quotation by ID
 */
export async function getById(id: number): Promise<Quotation | null> {
  ensureConnected();

  const row = await queryOne<QuotationRow>(`
    SELECT q.*, e.display_name as assigned_to_name
    FROM quotations q
    LEFT JOIN employees e ON q.assigned_to = e.id
    WHERE q.id = $1
  `, [id]);

  return row ? transformRow(row) : null;
}

/**
 * Create a new quotation
 */
export async function create(data: CreateQuotationData): Promise<Quotation> {
  ensureConnected();

  const sql = `
    INSERT INTO quotations (
      reference, client_name, project_name, description, value,
      assigned_to, status, priority, due_date, sent_date,
      follow_up_date, probability, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const params = [
    data.reference ?? null,
    data.clientName,
    data.projectName ?? null,
    data.description ?? null,
    data.value ?? null,
    data.assignedTo ?? null,
    data.status ?? 'draft',
    data.priority ?? 'medium',
    data.dueDate ?? null,
    data.sentDate ?? null,
    data.followUpDate ?? null,
    data.probability ?? 50,
    data.notes ?? null,
  ];

  const rows = await query<QuotationRow>(sql, params);
  const created = transformRow(rows[0]);

  // Fetch again to get assigned_to_name
  return (await getById(created.id)) ?? created;
}

/**
 * Update a quotation
 */
export async function update(id: number, data: Partial<CreateQuotationData>): Promise<Quotation | null> {
  ensureConnected();

  const existing = await getById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.reference !== undefined) {
    updates.push(`reference = $${paramIndex++}`);
    params.push(data.reference);
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
  if (data.value !== undefined) {
    updates.push(`value = $${paramIndex++}`);
    params.push(data.value);
  }
  if (data.assignedTo !== undefined) {
    updates.push(`assigned_to = $${paramIndex++}`);
    params.push(data.assignedTo);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  if (data.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`);
    params.push(data.priority);
  }
  if (data.dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex++}`);
    params.push(data.dueDate);
  }
  if (data.sentDate !== undefined) {
    updates.push(`sent_date = $${paramIndex++}`);
    params.push(data.sentDate);
  }
  if (data.followUpDate !== undefined) {
    updates.push(`follow_up_date = $${paramIndex++}`);
    params.push(data.followUpDate);
  }
  if (data.probability !== undefined) {
    updates.push(`probability = $${paramIndex++}`);
    params.push(data.probability);
  }
  if (data.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    params.push(data.notes);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE quotations SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
  await execute(sql, params);

  return getById(id);
}

/**
 * Delete a quotation
 */
export async function deleteQuotation(id: number): Promise<boolean> {
  ensureConnected();

  const count = await execute('DELETE FROM quotations WHERE id = $1', [id]);
  return count > 0;
}

/**
 * Get distinct statuses
 */
export function getStatuses(): QuotationStatus[] {
  return ['draft', 'sent', 'follow_up', 'won', 'lost'];
}

/**
 * Get distinct priorities
 */
export function getPriorities(): Priority[] {
  return ['low', 'medium', 'high', 'urgent'];
}

/**
 * Get quotation count
 */
export async function getCount(status?: QuotationStatus): Promise<number> {
  ensureConnected();

  let sql = 'SELECT COUNT(*) as count FROM quotations';
  const params: unknown[] = [];

  if (status) {
    sql += ' WHERE status = $1';
    params.push(status);
  }

  const row = await queryOne<{ count: string }>(sql, params);
  return row ? parseInt(row.count, 10) : 0;
}

/**
 * Get quotations statistics
 */
export async function getStats(): Promise<{
  total: number;
  byStatus: Record<QuotationStatus, number>;
  totalValue: number;
  avgProbability: number;
}> {
  ensureConnected();

  const [countRows, valueRow] = await Promise.all([
    query<{ status: string; count: string }>('SELECT status, COUNT(*) as count FROM quotations GROUP BY status'),
    queryOne<{ total_value: string; avg_probability: string }>(`
      SELECT COALESCE(SUM(value), 0) as total_value, COALESCE(AVG(probability), 0) as avg_probability
      FROM quotations WHERE status NOT IN ('won', 'lost')
    `),
  ]);

  const byStatus: Record<QuotationStatus, number> = {
    draft: 0,
    sent: 0,
    follow_up: 0,
    won: 0,
    lost: 0,
  };

  let total = 0;
  for (const row of countRows) {
    const count = parseInt(row.count, 10);
    byStatus[row.status as QuotationStatus] = count;
    total += count;
  }

  return {
    total,
    byStatus,
    totalValue: valueRow ? parseFloat(valueRow.total_value) : 0,
    avgProbability: valueRow ? parseFloat(valueRow.avg_probability) : 0,
  };
}
