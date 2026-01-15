import { getDatabase } from '../database/connection';
import { AtomFeedRow } from '../database/schema';
import { parseAtomSvcFile } from './atomsvc-parser';
import { testFeedConnection } from './native-sync';
import fs from 'fs';

export interface AtomFeed {
  id: number;
  name: string;
  feedType: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL';
  feedUrl: string;
  detailFeedId: number | null;
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
    detailFeedId: row.detail_feed_id,
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

/**
 * Update feed properties
 */
export function updateFeed(feedId: number, updates: { name?: string; feedType?: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' }): AtomFeed | null {
  const db = getDatabase();
  const feed = getFeedById(feedId);

  if (!feed) return null;

  const name = updates.name ?? feed.name;
  const feedType = updates.feedType ?? feed.feedType;

  db.prepare('UPDATE atom_feeds SET name = ?, feed_type = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name, feedType, feedId);

  return getFeedById(feedId);
}

/**
 * Link a detail feed to a summary feed for adaptive sync
 */
export function linkDetailFeed(summaryFeedId: number, detailFeedId: number): AtomFeed | null {
  const db = getDatabase();
  const summaryFeed = getFeedById(summaryFeedId);
  const detailFeed = getFeedById(detailFeedId);

  if (!summaryFeed || !detailFeed) {
    console.error('[Feeds] Cannot link: feed not found');
    return null;
  }

  if (summaryFeed.feedType !== 'PROJECTS') {
    console.error('[Feeds] Cannot link: summary feed must be PROJECTS type');
    return null;
  }

  if (detailFeed.feedType !== 'PROJECT_DETAIL') {
    console.error('[Feeds] Cannot link: detail feed must be PROJECT_DETAIL type');
    return null;
  }

  db.prepare('UPDATE atom_feeds SET detail_feed_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(detailFeedId, summaryFeedId);

  console.log(`[Feeds] Linked detail feed ${detailFeedId} to summary feed ${summaryFeedId}`);
  return getFeedById(summaryFeedId);
}

/**
 * Unlink a detail feed from a summary feed
 */
export function unlinkDetailFeed(summaryFeedId: number): AtomFeed | null {
  const db = getDatabase();
  const feed = getFeedById(summaryFeedId);

  if (!feed) return null;

  db.prepare('UPDATE atom_feeds SET detail_feed_id = NULL, updated_at = datetime(\'now\') WHERE id = ?')
    .run(summaryFeedId);

  console.log(`[Feeds] Unlinked detail feed from summary feed ${summaryFeedId}`);
  return getFeedById(summaryFeedId);
}

/**
 * Get the detail feed linked to a summary feed
 */
export function getDetailFeed(summaryFeedId: number): AtomFeed | null {
  const feed = getFeedById(summaryFeedId);
  if (!feed || !feed.detailFeedId) return null;
  return getFeedById(feed.detailFeedId);
}

/**
 * Get all PROJECT_DETAIL feeds (for linking dropdown)
 */
export function getDetailFeeds(): AtomFeed[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT * FROM atom_feeds WHERE feed_type = 'PROJECT_DETAIL' ORDER BY name").all() as AtomFeedRow[];
  return rows.map(transformRow);
}
