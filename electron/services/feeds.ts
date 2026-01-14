import { getDatabase } from '../database/connection';
import { AtomFeedRow } from '../database/schema';
import { parseAtomSvcFile } from './atomsvc-parser';
import { testFeedConnection } from './native-sync';
import fs from 'fs';

export interface AtomFeed {
  id: number;
  name: string;
  feedType: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS';
  feedUrl: string;
  lastSync: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedTestResult {
  success: boolean;
  recordCount?: number;
  error?: string;
}

function transformRow(row: AtomFeedRow): AtomFeed {
  return {
    id: row.id,
    name: row.name,
    feedType: row.feed_type,
    feedUrl: row.feed_url,
    lastSync: row.last_sync,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all configured feeds
 */
export function getAllFeeds(): AtomFeed[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM atom_feeds ORDER BY feed_type, name').all() as AtomFeedRow[];
  return rows.map(transformRow);
}

/**
 * Get a feed by ID
 */
export function getFeedById(id: number): AtomFeed | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM atom_feeds WHERE id = ?').get(id) as AtomFeedRow | undefined;
  return row ? transformRow(row) : null;
}

/**
 * Import feeds from an ATOMSVC file
 */
export async function importFeed(filePath: string): Promise<AtomFeed[]> {
  const db = getDatabase();

  // Read and parse the file
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsedFeeds = await parseAtomSvcFile(content);

  const importedFeeds: AtomFeed[] = [];

  for (const feed of parsedFeeds) {
    // Check if feed URL already exists
    const existing = db.prepare('SELECT id FROM atom_feeds WHERE feed_url = ?').get(feed.feedUrl) as { id: number } | undefined;

    if (existing) {
      // Update existing feed
      db.prepare('UPDATE atom_feeds SET name = ?, feed_type = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
        feed.name,
        feed.feedType,
        existing.id
      );
      importedFeeds.push(getFeedById(existing.id)!);
    } else {
      // Insert new feed
      const result = db.prepare('INSERT INTO atom_feeds (name, feed_type, feed_url) VALUES (?, ?, ?)').run(
        feed.name,
        feed.feedType,
        feed.feedUrl
      );
      importedFeeds.push(getFeedById(result.lastInsertRowid as number)!);
    }
  }

  return importedFeeds;
}

/**
 * Delete a feed
 */
export function deleteFeed(feedId: number): void {
  const db = getDatabase();
  db.prepare('DELETE FROM atom_feeds WHERE id = ?').run(feedId);
}

/**
 * Test a feed by actually fetching and parsing it
 */
export async function testFeed(feedId: number): Promise<FeedTestResult> {
  const feed = getFeedById(feedId);

  if (!feed) {
    return { success: false, error: 'Feed not found' };
  }

  try {
    // Validate URL format first
    new URL(feed.feedUrl);

    // Actually fetch and parse the feed
    const result = await testFeedConnection(feed.feedUrl);

    if (result.success) {
      console.log(`[Feeds] Test successful: ${result.recordCount} records, fields: ${result.sampleFields?.join(', ')}`);
    }

    return {
      success: result.success,
      recordCount: result.recordCount,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid feed URL',
    };
  }
}

/**
 * Update last sync time for a feed
 */
export function updateLastSync(feedId: number): void {
  const db = getDatabase();
  db.prepare('UPDATE atom_feeds SET last_sync = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').run(feedId);
}

/**
 * Toggle feed active state
 */
export function toggleFeedActive(feedId: number, isActive: boolean): void {
  const db = getDatabase();
  db.prepare('UPDATE atom_feeds SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(isActive ? 1 : 0, feedId);
}
