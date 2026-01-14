import { parseStringPromise } from 'xml2js';

export interface ParsedAtomFeed {
  name: string;
  feedUrl: string;
  feedType: 'PROJECTS' | 'OPPORTUNITIES';
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

    // Handle ATOMSVC format
    if (result.service?.workspace) {
      for (const workspace of result.service.workspace) {
        if (workspace.collection) {
          for (const collection of workspace.collection) {
            const href = collection.$?.href || collection.href;
            const title = collection.title?.[0] || collection.title || 'Unnamed Feed';

            if (href) {
              feeds.push({
                name: typeof title === 'string' ? title : title._ || 'Unnamed Feed',
                feedUrl: decodeAtomUrl(href),
                feedType: detectFeedType(href),
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
 * Detect feed type based on URL content
 */
function detectFeedType(url: string): 'PROJECTS' | 'OPPORTUNITIES' {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('project') || lowerUrl.includes('pm ') || lowerUrl.includes('project%20')) {
    return 'PROJECTS';
  }

  if (lowerUrl.includes('opportunit') || lowerUrl.includes('sales') || lowerUrl.includes('pipeline')) {
    return 'OPPORTUNITIES';
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
