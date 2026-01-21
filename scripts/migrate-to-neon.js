/**
 * Migration Script: Source Whiteboard PostgreSQL → Neon PostgreSQL
 *
 * This script migrates employees, quotations, and tasks from the source
 * resourceboard database to the new Neon cloud database.
 *
 * Usage:
 *   NEON_URL="postgresql://..." node scripts/migrate-to-neon.js
 *
 * Or edit the NEON_CONNECTION_STRING variable below.
 */

const { Pool } = require('pg');

// ============================================================================
// CONFIGURATION
// ============================================================================

// Source database (whiteboard on 10.19.12.233)
const SOURCE_CONFIG = {
  host: '10.19.12.233',
  port: 5433,
  database: 'resourceboard',
  user: 'sga',
  password: 'Sgr3s0urc3B0ard2025!',
  ssl: false,
  connectionTimeoutMillis: 30000,
};

// Neon database - SET THIS or use NEON_URL environment variable
const NEON_CONNECTION_STRING = process.env.NEON_URL || '';

// ============================================================================
// STATUS MAPPINGS
// ============================================================================

// Map source status values to Neon format (lowercase)
const QUOTATION_STATUS_MAP = {
  'DRAFT': 'draft',
  'SENT': 'sent',
  'FOLLOW_UP': 'follow_up',
  'WON': 'won',
  'LOST': 'lost',
  'NOT_STARTED': 'draft',  // Map NOT_STARTED to draft
};

const TASK_STATUS_MAP = {
  'NOT_STARTED': 'todo',
  'TODO': 'todo',
  'IN_PROGRESS': 'in_progress',
  'REVIEW': 'review',
  'DONE': 'done',
  'COMPLETED': 'done',
  'BLOCKED': 'blocked',
  'ON_HOLD': 'blocked',
};

const PRIORITY_MAP = {
  'LOW': 'low',
  'MEDIUM': 'medium',
  'HIGH': 'high',
  'URGENT': 'urgent',
};

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

async function migrate() {
  if (!NEON_CONNECTION_STRING) {
    console.error('ERROR: Neon connection string not provided!');
    console.error('Set NEON_URL environment variable or edit NEON_CONNECTION_STRING in this script.');
    console.error('\nExample:');
    console.error('  NEON_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require" node scripts/migrate-to-neon.js');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('WHITEBOARD → NEON MIGRATION');
  console.log('='.repeat(60));

  // Create connection pools
  const sourcePool = new Pool(SOURCE_CONFIG);
  const neonPool = new Pool({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  let sourceClient, neonClient;

  try {
    // Connect to both databases
    console.log('\n[1/6] Connecting to databases...');
    sourceClient = await sourcePool.connect();
    console.log('  ✓ Connected to source (10.19.12.233:5433/resourceboard)');

    neonClient = await neonPool.connect();
    console.log('  ✓ Connected to Neon');

    // Ensure Neon schema exists
    console.log('\n[2/6] Ensuring Neon schema exists...');
    await ensureNeonSchema(neonClient);
    console.log('  ✓ Schema ready');

    // Migrate employees first (we need ID mapping for foreign keys)
    console.log('\n[3/6] Migrating employees...');
    const employeeIdMap = await migrateEmployees(sourceClient, neonClient);
    console.log(`  ✓ Migrated ${Object.keys(employeeIdMap).length} employees`);

    // Migrate quotations
    console.log('\n[4/6] Migrating quotations...');
    const quotationCount = await migrateQuotations(sourceClient, neonClient, employeeIdMap);
    console.log(`  ✓ Migrated ${quotationCount} quotations`);

    // Migrate tasks
    console.log('\n[5/6] Migrating tasks...');
    const taskCount = await migrateTasks(sourceClient, neonClient, employeeIdMap);
    console.log(`  ✓ Migrated ${taskCount} tasks`);

    // Verify migration
    console.log('\n[6/6] Verifying migration...');
    await verifyMigration(neonClient);

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nMIGRATION FAILED:', error.message);
    throw error;
  } finally {
    if (sourceClient) sourceClient.release();
    if (neonClient) neonClient.release();
    await sourcePool.end();
    await neonPool.end();
  }
}

async function ensureNeonSchema(client) {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100),
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

    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) DEFAULT '#3B82F6',
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      is_lead BOOLEAN DEFAULT FALSE,
      UNIQUE(team_id, employee_id)
    );

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

    CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
    CREATE INDEX IF NOT EXISTS idx_resource_tasks_employee_id ON resource_tasks(employee_id);
    CREATE INDEX IF NOT EXISTS idx_resource_tasks_status ON resource_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
    CREATE INDEX IF NOT EXISTS idx_quotations_assigned_to ON quotations(assigned_to);
  `;

  await client.query(schemaSQL);
}

async function migrateEmployees(sourceClient, neonClient) {
  // Map old IDs to new IDs
  const idMap = {};

  // Fetch all employees from source
  const { rows: sourceEmployees } = await sourceClient.query(`
    SELECT id, first_name, last_name, display_name, email, role, department,
           color, avatar_url, is_senior, is_active, sort_order, created_at, updated_at
    FROM employees
    ORDER BY sort_order, id
  `);

  console.log(`  Found ${sourceEmployees.length} employees in source`);

  // Check for existing employees in Neon (by display_name to avoid duplicates)
  const { rows: existingEmployees } = await neonClient.query(`
    SELECT id, display_name FROM employees
  `);
  const existingByName = new Map(existingEmployees.map(e => [e.display_name?.toLowerCase(), e.id]));

  for (const emp of sourceEmployees) {
    const normalizedName = emp.display_name?.toLowerCase();

    // Check if employee already exists - map ID and skip insert
    if (existingByName.has(normalizedName)) {
      idMap[emp.id] = existingByName.get(normalizedName);
      console.log(`  → Existing: ${emp.display_name} (${emp.id} → ${idMap[emp.id]})`);
      continue;
    }

    // Insert new employee (handle NULLs for NOT NULL columns)
    const result = await neonClient.query(`
      INSERT INTO employees (
        first_name, last_name, display_name, email, role, department,
        color, avatar_url, is_senior, is_active, sort_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      emp.first_name || '',
      emp.last_name || '',  // Source allows NULL, Neon requires NOT NULL
      emp.display_name,
      emp.email,
      emp.role,
      emp.department,
      emp.color,
      emp.avatar_url,
      emp.is_senior ?? false,
      emp.is_active ?? true,
      emp.sort_order ?? 0,
      emp.created_at,
      emp.updated_at,
    ]);

    idMap[emp.id] = result.rows[0].id;
    existingByName.set(normalizedName, result.rows[0].id); // Track newly inserted
    console.log(`  → Inserted: ${emp.display_name} (${emp.id} → ${idMap[emp.id]})`);
  }

  return idMap;
}

async function migrateQuotations(sourceClient, neonClient, employeeIdMap) {
  // Fetch all quotations from source
  const { rows: sourceQuotations } = await sourceClient.query(`
    SELECT id, reference, client_name, project_name, description, value,
           assigned_to, status, priority, due_date, sent_date, follow_up_date,
           notes, created_at, updated_at
    FROM quotations
    ORDER BY sort_order, id
  `);

  console.log(`  Found ${sourceQuotations.length} quotations in source`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const quot of sourceQuotations) {
    // Skip quotations with no valid reference
    if (!quot.reference || quot.reference === 'N/A' || quot.reference.trim() === '') {
      console.log(`  → Skipping invalid reference: "${quot.reference}" - ${quot.client_name}`);
      skippedCount++;
      continue;
    }

    // Map employee ID
    const mappedEmployeeId = quot.assigned_to ? employeeIdMap[quot.assigned_to] : null;

    // Map status and priority to lowercase
    const mappedStatus = QUOTATION_STATUS_MAP[quot.status] || 'draft';
    const mappedPriority = PRIORITY_MAP[quot.priority] || 'medium';

    // Use UPSERT to handle duplicates
    const result = await neonClient.query(`
      INSERT INTO quotations (
        reference, client_name, project_name, description, value,
        assigned_to, status, priority, due_date, sent_date, follow_up_date,
        probability, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (reference) DO UPDATE SET
        client_name = EXCLUDED.client_name,
        project_name = EXCLUDED.project_name,
        description = EXCLUDED.description,
        value = EXCLUDED.value,
        assigned_to = EXCLUDED.assigned_to,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        due_date = EXCLUDED.due_date,
        sent_date = EXCLUDED.sent_date,
        follow_up_date = EXCLUDED.follow_up_date,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `, [
      quot.reference,
      quot.client_name,
      quot.project_name,
      quot.description,
      quot.value,
      mappedEmployeeId,
      mappedStatus,
      mappedPriority,
      quot.due_date,
      quot.sent_date,
      quot.follow_up_date,
      50, // Default probability
      quot.notes,
      quot.created_at,
      quot.updated_at,
    ]);

    if (result.rows[0].inserted) {
      insertedCount++;
      console.log(`  → Inserted: ${quot.reference} - ${quot.client_name}`);
    } else {
      updatedCount++;
      console.log(`  → Updated: ${quot.reference} - ${quot.client_name}`);
    }
  }

  console.log(`  Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`);
  return insertedCount + updatedCount;
}

async function migrateTasks(sourceClient, neonClient, employeeIdMap) {
  // Fetch all active tasks from source
  const { rows: sourceTasks } = await sourceClient.query(`
    SELECT id, employee_id, client_name, project_name, description,
           priority, status, due_date, estimated_hours, percent_complete,
           sort_order, created_at, updated_at
    FROM tasks
    WHERE is_active = true
    ORDER BY sort_order, id
  `);

  console.log(`  Found ${sourceTasks.length} active tasks in source`);

  // We'll insert all tasks (no unique constraint to check against)
  // First, clear existing tasks to avoid duplicates on re-run
  // Commented out - uncomment if you want to replace all tasks:
  // await neonClient.query('TRUNCATE resource_tasks CASCADE');

  let insertedCount = 0;
  let skippedCount = 0;

  for (const task of sourceTasks) {
    // Map employee ID
    const mappedEmployeeId = task.employee_id ? employeeIdMap[task.employee_id] : null;

    if (task.employee_id && !mappedEmployeeId) {
      console.log(`  → Skipping task "${task.project_name}" - employee ID ${task.employee_id} not mapped`);
      skippedCount++;
      continue;
    }

    // Map status and priority to lowercase
    const mappedStatus = TASK_STATUS_MAP[task.status] || 'todo';
    const mappedPriority = PRIORITY_MAP[task.priority] || 'medium';

    await neonClient.query(`
      INSERT INTO resource_tasks (
        employee_id, client_name, project_name, description,
        priority, status, due_date, estimated_hours, percent_complete,
        sort_order, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      mappedEmployeeId,
      task.client_name,
      task.project_name,
      task.description,
      mappedPriority,
      mappedStatus,
      task.due_date,
      task.estimated_hours,
      task.percent_complete,
      task.sort_order,
      task.created_at,
      task.updated_at,
    ]);

    insertedCount++;
    console.log(`  → Inserted: ${task.client_name} - ${task.project_name}`);
  }

  console.log(`  Inserted: ${insertedCount}, Skipped: ${skippedCount}`);
  return insertedCount;
}

async function verifyMigration(neonClient) {
  const counts = await neonClient.query(`
    SELECT
      (SELECT COUNT(*) FROM employees) as employees,
      (SELECT COUNT(*) FROM quotations) as quotations,
      (SELECT COUNT(*) FROM resource_tasks) as tasks
  `);

  const { employees, quotations, tasks } = counts.rows[0];
  console.log(`\n  Neon Database Summary:`);
  console.log(`  ├─ Employees: ${employees}`);
  console.log(`  ├─ Quotations: ${quotations}`);
  console.log(`  └─ Tasks: ${tasks}`);
}

// ============================================================================
// RUN MIGRATION
// ============================================================================

migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
