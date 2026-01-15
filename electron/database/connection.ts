import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { createTablesSQL, defaultSettings, SCHEMA_VERSION } from './schema';

let db: Database.Database | null = null;

/**
 * Get the database file path
 */
export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'cw-dashboard.db');
}

/**
 * Get the database instance (singleton)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Initialize the database connection and schema
 */
export async function initDatabase(): Promise<void> {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`Initializing database at: ${dbPath}`);

  // Create database connection
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Use WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Run schema creation
  db.exec(createTablesSQL);

  // Check and run migrations
  await runMigrations();

  // Initialize default settings if not present
  initializeDefaultSettings();

  console.log('Database initialized successfully');
}

/**
 * Run any pending migrations
 */
async function runMigrations(): Promise<void> {
  if (!db) return;

  // Get current schema version
  const versionRow = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as
    | { version: number }
    | undefined;

  const currentVersion = versionRow?.version ?? 0;

  if (currentVersion < SCHEMA_VERSION) {
    console.log(`Migrating database from version ${currentVersion} to ${SCHEMA_VERSION}`);

    // Run migrations for each version
    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      await runMigration(v);
    }

    // Record new version
    db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  }
}

/**
 * Run a specific migration version
 */
async function runMigration(version: number): Promise<void> {
  console.log(`Running migration for version ${version}`);
  if (!db) return;

  // Add migration logic here as needed
  switch (version) {
    case 1:
      // Initial schema - already created by createTablesSQL
      break;
    case 2:
      // Add raw_data column to projects table
      console.log('Adding raw_data column to projects table');
      try {
        db.exec('ALTER TABLE projects ADD COLUMN raw_data TEXT');
      } catch (e) {
        // Column might already exist
        console.log('raw_data column may already exist:', e);
      }
      break;
    case 3:
      // Add detail_feed_id column for adaptive sync and update feed_type constraint
      console.log('Adding detail_feed_id column to atom_feeds table');
      try {
        db.exec('ALTER TABLE atom_feeds ADD COLUMN detail_feed_id INTEGER REFERENCES atom_feeds(id) ON DELETE SET NULL');
      } catch (e) {
        // Column might already exist
        console.log('detail_feed_id column may already exist:', e);
      }
      break;
    default:
      console.log(`No migration needed for version ${version}`);
  }
}

/**
 * Initialize default settings if they don't exist
 */
function initializeDefaultSettings(): void {
  if (!db) return;

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}

/**
 * Export the database type for use in services
 */
export type DatabaseInstance = Database.Database;
