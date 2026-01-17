import { getDatabase } from '../database/connection';
import { AtomFeedRow } from '../database/schema';
import { parseAtomSvcFile } from './atomsvc-parser';
import { testFeedConnection } from './native-sync';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

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
 * Validate file path for security
 * Prevents path traversal and ensures valid file extension
 */
function validateFilePath(filePath: string): void {
  // Check for path traversal attempts
  if (filePath.includes('..')) {
    throw new Error('Invalid file path: path traversal not allowed');
  }

  // Validate extension
  const ext = path.extname(filePath).toLowerCase();
  if (!['.atomsvc', '.xml'].includes(ext)) {
    throw new Error('Invalid file type: only .atomsvc and .xml files are allowed');
  }
}

/**
 * Import feeds from an ATOMSVC file
 */
export async function importFeed(filePath: string): Promise<AtomFeed[]> {
  // Validate file path before reading
  validateFilePath(filePath);

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

/**
 * Test fetch detail for a single project to see all available fields
 * @param specificProjectId - Optional specific project ID to test with
 */
export async function testFetchProjectDetail(specificProjectId?: string): Promise<{
  success: boolean;
  projectId?: string;
  fieldCount?: number;
  fields?: Record<string, unknown>;
  error?: string;
  debug?: {
    detailFeedUrl: string;
    constructedUrl: string;
    xmlLength?: number;
    xmlPreview?: string;
    entryCount?: number;
  };
}> {
  const db = getDatabase();

  // Get a linked PROJECTS feed
  const projectsFeed = db.prepare(`
    SELECT pf.*, df.feed_url as detail_feed_url
    FROM atom_feeds pf
    JOIN atom_feeds df ON pf.detail_feed_id = df.id
    WHERE pf.feed_type = 'PROJECTS' AND pf.detail_feed_id IS NOT NULL AND pf.is_active = 1
    LIMIT 1
  `).get() as (AtomFeedRow & { detail_feed_url: string }) | undefined;

  if (!projectsFeed) {
    return {
      success: false,
      error: 'No PROJECTS feed with linked detail feed found. Please link a PROJECT_DETAIL feed first.',
    };
  }

  // Get a project to test with - use specific ID if provided
  let projectId: string;
  if (specificProjectId) {
    projectId = specificProjectId;
  } else {
    const project = db.prepare('SELECT external_id FROM projects LIMIT 1').get() as { external_id: string } | undefined;
    if (!project) {
      return {
        success: false,
        error: 'No projects in database. Please run a sync first.',
      };
    }
    projectId = project.external_id;
  }

  try {
    // Import functions dynamically to avoid circular dependency
    const { fetchProjectDetail, fetchAtomFeed } = await import('./native-sync');
    const { createDetailFeedUrl } = await import('./atomsvc-parser');

    // Create the URL that would be used
    const constructedUrl = createDetailFeedUrl(projectsFeed.detail_feed_url, projectId);

    // Try to fetch the raw XML for debugging
    let xmlLength: number | undefined;
    let xmlPreview: string | undefined;
    let entryCount: number | undefined;
    let hasEntries = false;
    try {
      const xmlContent = await fetchAtomFeed(constructedUrl);
      xmlLength = xmlContent.length;
      // Show first 1000 chars of XML for debugging
      xmlPreview = xmlContent.substring(0, 1000);
      // Count entries in the response
      const entryMatches = xmlContent.match(/<entry>/gi);
      entryCount = entryMatches ? entryMatches.length : 0;
      hasEntries = entryCount > 0;
      console.log(`[TestFetch] XML length: ${xmlLength}, entries found: ${entryCount}`);
    } catch (fetchErr) {
      console.log(`[TestFetch] Error fetching raw XML:`, fetchErr);
      // Ignore - we'll show the main error
    }

    const result = await fetchProjectDetail(projectsFeed.detail_feed_url, projectId);

    if (!result) {
      return {
        success: false,
        projectId: projectId,
        error: `No detail data returned for project ${projectId}. The detail feed may not have data for this project ID. (${entryCount || 0} entries in XML response)`,
        debug: {
          detailFeedUrl: projectsFeed.detail_feed_url,
          constructedUrl,
          xmlLength,
          xmlPreview,
          entryCount,
        },
      };
    }

    return {
      success: true,
      projectId: projectId,
      fieldCount: Object.keys(result.allFields).length,
      fields: result.allFields,
      debug: {
        detailFeedUrl: projectsFeed.detail_feed_url,
        constructedUrl,
        xmlLength,
        entryCount,
      },
    };
  } catch (err) {
    return {
      success: false,
      projectId: projectId,
      error: err instanceof Error ? err.message : 'Unknown error fetching detail',
    };
  }
}

/**
 * Get comprehensive diagnostics for detail sync troubleshooting
 */
export function getDetailSyncConfigDiagnostics(): {
  adaptiveSyncEnabled: boolean;
  projectsFeeds: { id: number; name: string; isActive: boolean; hasDetailLink: boolean; detailFeedId: number | null }[];
  detailFeeds: { id: number; name: string; isActive: boolean; feedUrl: string }[];
  linkedPairs: { projectsFeedId: number; projectsFeedName: string; detailFeedId: number; detailFeedName: string }[];
} {
  const db = getDatabase();

  // Check adaptive sync setting
  const adaptiveSetting = db.prepare("SELECT value FROM settings WHERE key = 'adaptive_sync_enabled'").get() as { value: string } | undefined;
  // Default is true if not set
  const adaptiveSyncEnabled = adaptiveSetting ? adaptiveSetting.value === 'true' : true;

  // Get all PROJECTS feeds
  const projectsFeedsRows = db.prepare("SELECT * FROM atom_feeds WHERE feed_type = 'PROJECTS' ORDER BY name").all() as AtomFeedRow[];
  const projectsFeeds = projectsFeedsRows.map(row => ({
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1,
    hasDetailLink: row.detail_feed_id !== null,
    detailFeedId: row.detail_feed_id,
  }));

  // Get all PROJECT_DETAIL feeds
  const detailFeedsRows = db.prepare("SELECT * FROM atom_feeds WHERE feed_type = 'PROJECT_DETAIL' ORDER BY name").all() as AtomFeedRow[];
  const detailFeeds = detailFeedsRows.map(row => ({
    id: row.id,
    name: row.name,
    isActive: row.is_active === 1,
    feedUrl: row.feed_url.length > 100 ? row.feed_url.substring(0, 100) + '...' : row.feed_url,
  }));

  // Find linked pairs
  const linkedPairs: { projectsFeedId: number; projectsFeedName: string; detailFeedId: number; detailFeedName: string }[] = [];
  for (const pf of projectsFeedsRows) {
    if (pf.detail_feed_id) {
      const df = detailFeedsRows.find(d => d.id === pf.detail_feed_id);
      if (df) {
        linkedPairs.push({
          projectsFeedId: pf.id,
          projectsFeedName: pf.name,
          detailFeedId: df.id,
          detailFeedName: df.name,
        });
      }
    }
  }

  return {
    adaptiveSyncEnabled,
    projectsFeeds,
    detailFeeds,
    linkedPairs,
  };
}

/**
 * Get the templates directory path
 */
function getTemplatesDir(): string {
  // In development, templates are in the project root
  // In production, they're in the resources/templates folder
  const isDev = !app.isPackaged;

  if (isDev) {
    return path.join(__dirname, '..', '..', 'templates');
  } else {
    return path.join(process.resourcesPath, 'templates');
  }
}

/**
 * Get list of available ATOMSVC templates
 */
export function getAvailableTemplates(): { name: string; filename: string; type: string }[] {
  const templatesDir = getTemplatesDir();

  if (!fs.existsSync(templatesDir)) {
    console.log(`[Feeds] Templates directory not found: ${templatesDir}`);
    return [];
  }

  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.atomsvc'));

  return files.map(filename => {
    // Determine type from filename
    let type = 'PROJECTS';
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('detail')) type = 'PROJECT_DETAIL';
    else if (lowerName.includes('opportunit')) type = 'OPPORTUNITIES';
    else if (lowerName.includes('ticket') || lowerName.includes('service')) type = 'SERVICE_TICKETS';

    return {
      name: filename.replace('.atomsvc', '').replace(/-/g, ' '),
      filename,
      type,
    };
  });
}

/**
 * Export templates to a user-selected directory
 */
export async function exportTemplatesToDirectory(destDir: string): Promise<{ exported: string[]; errors: string[] }> {
  const templatesDir = getTemplatesDir();
  const exported: string[] = [];
  const errors: string[] = [];

  if (!fs.existsSync(templatesDir)) {
    errors.push(`Templates directory not found: ${templatesDir}`);
    return { exported, errors };
  }

  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.atomsvc'));

  for (const file of files) {
    try {
      const srcPath = path.join(templatesDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, destPath);
      exported.push(file);
    } catch (err) {
      errors.push(`Failed to copy ${file}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return { exported, errors };
}

/**
 * Read a template file content
 */
export function getTemplateContent(filename: string): string | null {
  // Validate filename - prevent path traversal
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new Error('Invalid template filename: path separators not allowed');
  }

  // Validate extension
  if (!filename.endsWith('.atomsvc')) {
    throw new Error('Invalid template file type: only .atomsvc files are allowed');
  }

  const templatesDir = getTemplatesDir();
  const filePath = path.join(templatesDir, filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf-8');
}
