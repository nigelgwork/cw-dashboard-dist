/**
 * Cloud Database Service
 *
 * Manages connection to cloud PostgreSQL (Neon) for shared data like
 * employees, teams, tasks, and quotations.
 */

import { Pool, PoolClient } from 'pg';
import { safeStorage } from 'electron';
import { getSetting, setSetting } from './settings';

// Connection pool
let pool: Pool | null = null;

// Connection status
export interface CloudStatus {
  connected: boolean;
  enabled: boolean;
  lastConnected: string | null;
  lastError: string | null;
  databaseUrl: string | null; // Masked for display
}

let connectionStatus: CloudStatus = {
  connected: false,
  enabled: false,
  lastConnected: null,
  lastError: null,
  databaseUrl: null,
};

// Setting keys for cloud database
export const CloudSettingKeys = {
  CONNECTION_STRING: 'cloud_db_connection_string',
  ENABLED: 'cloud_db_enabled',
  LAST_CONNECTED: 'cloud_db_last_connected',
};

/**
 * Schema SQL for auto-creation
 */
const SCHEMA_SQL = `
-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200),
    email VARCHAR(255),
    role VARCHAR(100),
    department VARCHAR(100),
    color VARCHAR(7) DEFAULT '#6366F1',
    avatar_url TEXT,
    is_senior BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members junction table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    is_lead BOOLEAN DEFAULT FALSE,
    UNIQUE(team_id, employee_id)
);

-- Resource tasks table
CREATE TABLE IF NOT EXISTS resource_tasks (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    project_external_id VARCHAR(255),
    client_name VARCHAR(255),
    project_name VARCHAR(255),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(30) DEFAULT 'todo',
    due_date DATE,
    estimated_hours DECIMAL(10,2),
    percent_complete INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(100) UNIQUE,
    client_name VARCHAR(255) NOT NULL,
    project_name VARCHAR(255),
    description TEXT,
    value DECIMAL(15,2),
    assigned_to INTEGER REFERENCES employees(id),
    status VARCHAR(30) DEFAULT 'draft',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    sent_date DATE,
    follow_up_date DATE,
    probability INTEGER DEFAULT 50,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_resource_tasks_employee_id ON resource_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_resource_tasks_status ON resource_tasks(status);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_assigned_to ON quotations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_employee_id ON team_members(employee_id);
`;

/**
 * Mask connection string for display
 */
function maskConnectionString(connStr: string): string {
  try {
    // Parse and mask password
    const url = new URL(connStr);
    if (url.password) {
      url.password = '****';
    }
    return url.toString();
  } catch {
    // If parsing fails, just mask middle portion
    if (connStr.length > 20) {
      return connStr.substring(0, 10) + '****' + connStr.substring(connStr.length - 10);
    }
    return '****';
  }
}

/**
 * Encrypt connection string using Electron's safeStorage
 */
function encryptConnectionString(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('[CloudDB] Encryption not available, storing in base64');
    return Buffer.from(plaintext).toString('base64');
  }
  return safeStorage.encryptString(plaintext).toString('base64');
}

/**
 * Decrypt connection string
 */
function decryptConnectionString(encrypted: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(encrypted, 'base64').toString('utf8');
  }
  try {
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  } catch (error) {
    console.error('[CloudDB] Failed to decrypt connection string:', error);
    throw new Error('Failed to decrypt connection string');
  }
}

/**
 * Get stored connection string (decrypted)
 */
export function getConnectionString(): string | null {
  const encrypted = getSetting(CloudSettingKeys.CONNECTION_STRING);
  if (!encrypted) return null;

  try {
    return decryptConnectionString(encrypted);
  } catch {
    return null;
  }
}

/**
 * Store connection string (encrypted)
 */
export function setConnectionString(connectionString: string): void {
  const encrypted = encryptConnectionString(connectionString);
  setSetting(CloudSettingKeys.CONNECTION_STRING, encrypted);
  connectionStatus.databaseUrl = maskConnectionString(connectionString);
}

/**
 * Clear connection string
 */
export function clearConnectionString(): void {
  setSetting(CloudSettingKeys.CONNECTION_STRING, '');
  connectionStatus.databaseUrl = null;
}

/**
 * Check if cloud database is enabled
 */
export function isCloudEnabled(): boolean {
  return getSetting(CloudSettingKeys.ENABLED) === 'true';
}

/**
 * Enable or disable cloud database
 */
export function setCloudEnabled(enabled: boolean): void {
  setSetting(CloudSettingKeys.ENABLED, enabled ? 'true' : 'false');
  connectionStatus.enabled = enabled;

  if (!enabled && pool) {
    disconnect();
  }
}

/**
 * Get current connection status
 */
export function getStatus(): CloudStatus {
  const connStr = getConnectionString();
  return {
    ...connectionStatus,
    enabled: isCloudEnabled(),
    databaseUrl: connStr ? maskConnectionString(connStr) : null,
  };
}

/**
 * Ensure schema exists in database
 */
async function ensureSchema(client: PoolClient): Promise<void> {
  // Check if employees table exists
  const result = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'employees'
    )
  `);

  if (!result.rows[0].exists) {
    console.log('[CloudDB] Creating schema...');
    await client.query(SCHEMA_SQL);
    console.log('[CloudDB] Schema created successfully');
  } else {
    console.log('[CloudDB] Schema already exists');
  }
}

/**
 * Connect to cloud database
 */
export async function connect(): Promise<boolean> {
  const connectionString = getConnectionString();

  if (!connectionString) {
    connectionStatus.lastError = 'No connection string configured';
    connectionStatus.connected = false;
    return false;
  }

  try {
    // Disconnect existing pool if any
    if (pool) {
      await pool.end();
      pool = null;
    }

    // Create new pool
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
      max: 5, // Max connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test connection and ensure schema
    const client = await pool.connect();
    try {
      await ensureSchema(client);
    } finally {
      client.release();
    }

    connectionStatus.connected = true;
    connectionStatus.lastConnected = new Date().toISOString();
    connectionStatus.lastError = null;
    connectionStatus.enabled = true;

    setSetting(CloudSettingKeys.LAST_CONNECTED, connectionStatus.lastConnected);
    setSetting(CloudSettingKeys.ENABLED, 'true');

    console.log('[CloudDB] Connected successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    connectionStatus.lastError = errorMessage;
    connectionStatus.connected = false;
    console.error('[CloudDB] Connection failed:', errorMessage);

    if (pool) {
      await pool.end().catch(() => {});
      pool = null;
    }

    return false;
  }
}

/**
 * Disconnect from cloud database
 */
export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
  connectionStatus.connected = false;
  console.log('[CloudDB] Disconnected');
}

/**
 * Get connection pool (throws if not connected)
 */
export function getPool(): Pool {
  if (!pool || !connectionStatus.connected) {
    throw new Error('Cloud database not connected');
  }
  return pool;
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return connectionStatus.connected && pool !== null;
}

/**
 * Test connection with a given connection string
 */
export async function testConnection(connectionString: string): Promise<{
  success: boolean;
  message: string;
  schemaExists?: boolean;
}> {
  let testPool: Pool | null = null;

  try {
    testPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 1,
      connectionTimeoutMillis: 10000,
    });

    const client = await testPool.connect();
    try {
      // Test basic query
      await client.query('SELECT 1');

      // Check if schema exists
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'employees'
        )
      `);
      const schemaExists = result.rows[0].exists;

      return {
        success: true,
        message: schemaExists
          ? 'Connection successful - schema exists'
          : 'Connection successful - schema will be created on first use',
        schemaExists,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
    };
  } finally {
    if (testPool) {
      await testPool.end().catch(() => {});
    }
  }
}

/**
 * Execute a query on the cloud database
 */
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const p = getPool();
  const result = await p.query(sql, params);
  return result.rows as T[];
}

/**
 * Execute a query and return single row
 */
export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

/**
 * Execute a mutation (INSERT/UPDATE/DELETE) and return affected count
 */
export async function execute(sql: string, params?: unknown[]): Promise<number> {
  const p = getPool();
  const result = await p.query(sql, params);
  return result.rowCount ?? 0;
}

/**
 * Auto-connect on startup if enabled and connection string exists
 */
export async function autoConnect(): Promise<void> {
  if (isCloudEnabled() && getConnectionString()) {
    console.log('[CloudDB] Auto-connecting...');
    await connect();
  }
}
