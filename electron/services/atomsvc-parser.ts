import { parseStringPromise } from 'xml2js';

export interface ParsedAtomFeed {
  name: string;
  feedUrl: string;
  feedType: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS';
}

/**
 * Extract string value from xml2js parsed node
 * Handles various formats: string, {_: string}, [{_: string}], etc.
 */
function extractString(node: unknown, defaultValue: string = ''): string {
  if (!node) return defaultValue;
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    const first = node[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && '_' in first) return String(first._);
    if (first && typeof first === 'object' && '#text' in first) return String((first as Record<string, unknown>)['#text']);
  }
  if (typeof node === 'object' && node !== null) {
    if ('_' in node) return String((node as Record<string, unknown>)._);
    if ('#text' in node) return String((node as Record<string, unknown>)['#text']);
  }
  return defaultValue;
}

/**
 * Parse an ATOMSVC file content
 *
 * ATOMSVC files are XML subscription documents from SSRS with this structure:
 * <?xml version="1.0" encoding="utf-8"?>
 * <service xmlns="http://www.w3.org/2007/app">
 *   <workspace>
 *     <title>Report Server</title>
 *     <collection href="http://server/ReportServer?%2FFolder%2FReport&amp;rs:Command=Render&amp;rs:Format=ATOM">
 *       <title>Report Title</title>
 *     </collection>
 *   </workspace>
 * </service>
 */
export async function parseAtomSvcFile(content: string): Promise<ParsedAtomFeed[]> {
  const feeds: ParsedAtomFeed[] = [];

  try {
    const result = await parseStringPromise(content, {
      explicitArray: true,
      ignoreAttrs: false,
      tagNameProcessors: [(name) => name.toLowerCase()],
    });

    console.log('[AtomSvcParser] Parsed structure keys:', Object.keys(result));

    // Handle ATOMSVC format
    if (result.service?.workspace) {
      for (const workspace of result.service.workspace) {
        console.log('[AtomSvcParser] Workspace keys:', Object.keys(workspace));

        // Get the workspace title - this is usually the report name like "Opportunity List"
        // Check both 'atom:title' and 'title' keys since xml2js lowercases and may have namespace prefix
        const workspaceTitle = extractString(workspace['atom:title'] || workspace.title, '');
        console.log(`[AtomSvcParser] Workspace title: "${workspaceTitle}"`);

        if (workspace.collection) {
          const collections = workspace.collection;
          const collectionCount = collections.length;

          for (let i = 0; i < collectionCount; i++) {
            const collection = collections[i];
            console.log('[AtomSvcParser] Collection:', JSON.stringify(collection, null, 2));

            const href = collection.$?.href || collection.href;
            const collectionTitle = extractString(collection['atom:title'] || collection.title, '');

            console.log(`[AtomSvcParser] Extracted - collectionTitle: "${collectionTitle}", href: "${href}"`);

            if (href) {
              // Determine the feed name:
              // 1. If workspace title exists and collection title is just "TablixN", use workspace title
              // 2. If multiple collections, append a number suffix
              // 3. Otherwise use collection title or workspace title
              let feedName = collectionTitle || workspaceTitle || 'Unnamed Feed';

              // If collection title is a generic Tablix name, prefer workspace title
              const isGenericName = /^tablix\d*$/i.test(collectionTitle) ||
                                    /^table\d*$/i.test(collectionTitle) ||
                                    /^chart\d*$/i.test(collectionTitle) ||
                                    /^matrix\d*$/i.test(collectionTitle);

              if (isGenericName && workspaceTitle) {
                feedName = workspaceTitle;
                // If multiple collections with generic names, add suffix
                if (collectionCount > 1) {
                  feedName = `${workspaceTitle} (${i + 1})`;
                }
              }

              console.log(`[AtomSvcParser] Final feed name: "${feedName}"`);

              // Use workspace title for better type detection
              const feedType = detectFeedType(href, workspaceTitle || collectionTitle);
              console.log(`[AtomSvcParser] Detected feed type: ${feedType}`);

              feeds.push({
                name: feedName,
                feedUrl: decodeAtomUrl(href),
                feedType,
              });
            }
          }
        }
      }
    }

    // Handle direct ATOM feed format (alternative format)
    if (result.feed?.entry) {
      // This is an actual ATOM feed, not an ATOMSVC subscription file
      // Extract the title as the feed name
      const title = result.feed.title?.[0]?._ || result.feed.title?.[0] || 'ATOM Feed';
      feeds.push({
        name: typeof title === 'string' ? title : 'ATOM Feed',
        feedUrl: '', // Would need to be provided separately
        feedType: 'PROJECTS', // Default
      });
    }

    return feeds;
  } catch (error) {
    console.error('Error parsing ATOMSVC file:', error);
    throw new Error(`Failed to parse ATOMSVC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decode HTML entities in ATOM URL
 */
function decodeAtomUrl(url: string): string {
  return url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Detect feed type based on URL content and title
 */
function detectFeedType(url: string, title: string = ''): 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const combined = lowerUrl + ' ' + lowerTitle;

  // Check for service tickets patterns first (more specific)
  if (combined.includes('ticket') || combined.includes('service') ||
      combined.includes('helpdesk') || combined.includes('support') ||
      combined.includes('incident') || combined.includes('sr ') ||
      combined.includes('sr%20') || combined.includes('service%20')) {
    return 'SERVICE_TICKETS';
  }

  // Check for opportunities
  if (combined.includes('opportunit') || combined.includes('sales') ||
      combined.includes('pipeline') || combined.includes('opp ') ||
      combined.includes('opp%20')) {
    return 'OPPORTUNITIES';
  }

  // Check for projects
  if (combined.includes('project') || combined.includes('pm ') || combined.includes('project%20')) {
    return 'PROJECTS';
  }

  // Default to projects if unclear
  return 'PROJECTS';
}

/**
 * Validate that a string looks like an ATOMSVC or XML file
 */
export function isValidAtomSvcContent(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('<?xml') || trimmed.startsWith('<service') || trimmed.startsWith('<feed');
}

/**
 * Extract report parameters from an SSRS ATOM URL
 */
export function extractReportParameters(url: string): Record<string, string[]> {
  const params: Record<string, string[]> = {};

  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams(urlObj.search);

    for (const [key, value] of searchParams.entries()) {
      // Skip SSRS command parameters
      if (key.startsWith('rs:') || key.startsWith('rc:')) {
        continue;
      }

      if (!params[key]) {
        params[key] = [];
      }
      params[key].push(decodeURIComponent(value));
    }
  } catch {
    // Invalid URL, return empty params
  }

  return params;
}
