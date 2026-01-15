import { parseStringPromise } from 'xml2js';

export interface ParsedAtomFeed {
  name: string;
  feedUrl: string;
  feedType: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL';
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

          // Only import the first collection - additional collections are usually
          // summaries, charts, or secondary data regions that aren't needed for sync
          if (collectionCount > 1) {
            console.log(`[AtomSvcParser] Found ${collectionCount} collections, importing only the first one`);
          }

          // Just process the first collection
          for (let i = 0; i < Math.min(1, collectionCount); i++) {
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
              }

              console.log(`[AtomSvcParser] Final feed name: "${feedName}"`);

              // Use workspace title for better type detection
              const feedType = detectFeedType(href, workspaceTitle || collectionTitle);
              console.log(`[AtomSvcParser] Detected feed type: ${feedType}`);

              // Decode HTML entities first, then clean the URL
              // For PROJECT_DETAIL feeds, preserve multi-value parameters (don't remove "Select All")
              const decodedUrl = decodeAtomUrl(href);
              const preserveMultiValue = feedType === 'PROJECT_DETAIL';
              const { cleanedUrl, removedParams } = cleanSsrsUrl(decodedUrl, preserveMultiValue);

              if (removedParams.length > 0) {
                console.log(`[AtomSvcParser] Cleaned URL - removed ${removedParams.length} data parameters (${removedParams.join(', ')})`);
              }

              feeds.push({
                name: feedName,
                feedUrl: cleanedUrl,
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
 * Parameters that represent individual record IDs - these should be REMOVED
 * because they are "data" from the report, not filters.
 * When syncing, we want ALL records matching the filters, not specific IDs.
 */
const DATA_PARAMETERS = [
  'ProjectID',
  'Project_ID',
  'TicketNbr',
  'Ticket_Number',
  'TicketID',
  'Ticket_ID',
  'SR_RecID',
  'OpportunityID',
  'Opportunity_ID',
  'OppID',
  'RecID',
  'ID',
];

/**
 * Maximum number of values for a single parameter before we consider it
 * a "Select All" and remove it entirely. SSRS exports "Select All" as
 * individual values which makes URLs too long.
 */
const MAX_PARAMETER_VALUES = 30;

/**
 * Parameters that should be kept as filters
 */
const FILTER_PARAMETERS = [
  // Common filters
  'Locations',
  'Location',
  // Project filters
  'ProjectStatuses',
  'ProjectStatus',
  'ProjectManagers',
  'ProjectManager',
  'PM',
  // Opportunity filters
  'Sales_Rep',
  'SalesRep',
  'Stage',
  'Stages',
  // Service ticket filters
  'Status',
  'Statuses',
  'Priority',
  'Priorities',
  'Board',
  'Boards',
  'AssignedTo',
  'Assigned_To',
  'Company',
  'Companies',
  // Date filters - keep but may need dynamic handling
  'ThruDate',
  'FromDate',
  'StartDate',
  'EndDate',
  'DateFrom',
  'DateTo',
];

/**
 * Clean an SSRS ATOM URL by removing data parameters and keeping only filters
 *
 * SSRS ATOMSVC files often include ALL current parameter values, including
 * specific record IDs (like ProjectID=123). These are "data" not "filters".
 *
 * For sync to work properly, we need to:
 * 1. Remove data parameters (specific record IDs)
 * 2. Keep filter parameters (Locations, Status, etc.)
 * 3. Keep SSRS rendering parameters (rs:Command, rs:Format, rc:ItemPath)
 *
 * @param url The SSRS feed URL to clean
 * @param preserveMultiValue If true, don't remove parameters with many values (for detail feeds)
 */
export function cleanSsrsUrl(url: string, preserveMultiValue: boolean = false): { cleanedUrl: string; removedParams: string[]; keptParams: string[] } {
  const removedParams: string[] = [];
  const keptParams: string[] = [];

  try {
    // Parse the URL - SSRS URLs have a special format where the report path is in the query string
    // Example: http://server/ReportServer?%2FFolder%2FReport&Param1=value&rs:Format=ATOM
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // Parse query string manually since SSRS uses non-standard format
    // The first "parameter" is actually the report path (starts with %2F or /)
    const queryString = urlObj.search.substring(1); // Remove leading ?
    const allParams: Array<{ key: string; value: string }> = [];
    let reportPath = '';

    // First pass: collect all parameters and count occurrences
    const paramCounts: Record<string, number> = {};
    const parts = queryString.split('&');

    for (const part of parts) {
      if (!part) continue;

      const eqIndex = part.indexOf('=');
      if (eqIndex === -1) {
        // This is likely the report path (no = sign)
        if (part.startsWith('%2F') || part.startsWith('/')) {
          reportPath = part;
        }
        continue;
      }

      const key = part.substring(0, eqIndex);
      const value = part.substring(eqIndex + 1);

      allParams.push({ key, value });
      paramCounts[key] = (paramCounts[key] || 0) + 1;
    }

    // Log parameters with high counts
    for (const [key, count] of Object.entries(paramCounts)) {
      if (count > MAX_PARAMETER_VALUES) {
        if (preserveMultiValue) {
          console.log(`[AtomSvcParser] Parameter "${key}" has ${count} values - preserving for detail feed`);
        } else {
          console.log(`[AtomSvcParser] Parameter "${key}" has ${count} values (exceeds max ${MAX_PARAMETER_VALUES}) - will be removed as "Select All"`);
        }
      }
    }

    // Second pass: filter parameters
    const filteredParams: Array<{ key: string; value: string }> = [];

    for (const param of allParams) {
      const { key, value } = param;

      // Check if this is an SSRS command parameter (always keep)
      if (key.startsWith('rs:') || key.startsWith('rs%3A') ||
          key.startsWith('rc:') || key.startsWith('rc%3A')) {
        filteredParams.push({ key, value });
        if (!keptParams.includes(key)) keptParams.push(key);
        continue;
      }

      // Check if this is a data parameter (always remove)
      const isDataParam = DATA_PARAMETERS.some(dp =>
        key.toLowerCase() === dp.toLowerCase()
      );

      if (isDataParam) {
        removedParams.push(key);
        continue;
      }

      // Check if this parameter has too many values (treat as "Select All" and remove)
      // UNLESS preserveMultiValue is true (for detail feeds that need all filter values)
      if (!preserveMultiValue && paramCounts[key] > MAX_PARAMETER_VALUES) {
        removedParams.push(key);
        continue;
      }

      // Keep this parameter
      filteredParams.push({ key, value });
      if (!keptParams.includes(key)) {
        keptParams.push(key);
      }
    }

    // Reconstruct the URL
    let cleanedUrl = baseUrl + '?' + reportPath;

    for (const param of filteredParams) {
      cleanedUrl += '&' + param.key + '=' + param.value;
    }

    const uniqueRemoved = [...new Set(removedParams)];
    console.log(`[AtomSvcParser] Cleaned URL: removed ${uniqueRemoved.length} parameter types, kept ${keptParams.length} parameter types`);
    console.log(`[AtomSvcParser] URL length: ${url.length} -> ${cleanedUrl.length} chars`);
    if (uniqueRemoved.length > 0) {
      console.log(`[AtomSvcParser] Removed parameters: ${uniqueRemoved.join(', ')}`);
    }

    return { cleanedUrl, removedParams: uniqueRemoved, keptParams };
  } catch (error) {
    console.error('[AtomSvcParser] Error cleaning URL:', error);
    // Return original URL if cleaning fails
    return { cleanedUrl: url, removedParams: [], keptParams: [] };
  }
}

/**
 * Detect feed type based on URL content and title
 */
function detectFeedType(url: string, title: string = ''): 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const combined = lowerUrl + ' ' + lowerTitle;

  // Check for project detail feeds first (most specific)
  // PROJECT_DETAIL feeds have a SINGLE ProjectNo parameter (used as a template)
  // Regular PROJECTS feeds may have MULTIPLE ProjectID parameters (data selection, not a template)

  // Count occurrences of project ID parameters
  const projectNoCount = (lowerUrl.match(/projectno=/g) || []).length;
  const projectIdCount = (lowerUrl.match(/projectid=/g) || []).length;
  const pmProjectRecIdCount = (lowerUrl.match(/pm_project_recid=/g) || []).length;

  // A detail feed has exactly 1 ProjectNo (template) and possibly 1 PM_Project_RecID
  // A summary feed has many ProjectID values (data selection from "Select All")
  const isSingleProjectTemplate = projectNoCount === 1 && projectIdCount === 0;
  const hasMultipleProjectIds = projectIdCount > 1;

  console.log(`[AtomSvcParser] Project ID detection: ProjectNo=${projectNoCount}, ProjectID=${projectIdCount}, PM_Project_RecID=${pmProjectRecIdCount}`);

  if (isSingleProjectTemplate && combined.includes('project')) {
    console.log('[AtomSvcParser] Detected PROJECT_DETAIL feed (single ProjectNo template parameter)');
    return 'PROJECT_DETAIL';
  }

  // If it has multiple ProjectID values, it's a summary/list feed, not a detail feed
  if (hasMultipleProjectIds) {
    console.log('[AtomSvcParser] Detected PROJECTS feed (multiple ProjectID data parameters)');
    return 'PROJECTS';
  }

  // Check for service tickets patterns
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

  // Check for projects (summary/list feeds)
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

/**
 * Date parameters - end dates should be set to today
 */
const END_DATE_PARAMETERS = [
  'ThruDate',
  'EndDate',
  'DateTo',
  'ToDate',
  'End_Date',
  'Thru_Date',
];

/**
 * Date parameters - start dates should be set to (today - lookbackDays)
 */
const START_DATE_PARAMETERS = [
  'FromDate',
  'StartDate',
  'DateFrom',
  'Start_Date',
  'From_Date',
  'BeginDate',
  'Begin_Date',
];

/**
 * Format a date as M/D/YYYY for SSRS (e.g., "1/15/2024")
 * SSRS typically expects this format for date parameters
 */
function formatDateForSsrs(date: Date): string {
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Apply dynamic dates to an SSRS URL at sync time
 *
 * This replaces static date parameters from the ATOMSVC file with current dates:
 * - End dates (ThruDate, EndDate, etc.) → today
 * - Start dates (FromDate, StartDate, etc.) → today - lookbackDays
 *
 * @param url The SSRS feed URL
 * @param lookbackDays Number of days to look back for start dates (default 730 = 2 years)
 * @returns URL with dynamic dates applied
 */
export function applyDynamicDates(url: string, lookbackDays: number = 730): string {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // Parse query string manually since SSRS uses non-standard format
    const queryString = urlObj.search.substring(1); // Remove leading ?
    const parts = queryString.split('&');

    // Calculate dates
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - lookbackDays);

    const todayFormatted = formatDateForSsrs(today);
    const startDateFormatted = formatDateForSsrs(startDate);

    console.log(`[AtomSvcParser] Applying dynamic dates: FromDate=${startDateFormatted}, ThruDate=${todayFormatted}`);

    const updatedParts: string[] = [];
    let datesUpdated = 0;

    for (const part of parts) {
      if (!part) continue;

      const eqIndex = part.indexOf('=');
      if (eqIndex === -1) {
        // No = sign, keep as-is (likely report path)
        updatedParts.push(part);
        continue;
      }

      const key = part.substring(0, eqIndex);
      const keyLower = key.toLowerCase();

      // Check if this is an end date parameter
      const isEndDate = END_DATE_PARAMETERS.some(p => p.toLowerCase() === keyLower);
      if (isEndDate) {
        updatedParts.push(`${key}=${encodeURIComponent(todayFormatted)}`);
        datesUpdated++;
        continue;
      }

      // Check if this is a start date parameter
      const isStartDate = START_DATE_PARAMETERS.some(p => p.toLowerCase() === keyLower);
      if (isStartDate) {
        updatedParts.push(`${key}=${encodeURIComponent(startDateFormatted)}`);
        datesUpdated++;
        continue;
      }

      // Keep other parameters as-is
      updatedParts.push(part);
    }

    if (datesUpdated > 0) {
      console.log(`[AtomSvcParser] Updated ${datesUpdated} date parameters`);
    } else {
      console.log(`[AtomSvcParser] No date parameters found in URL`);
    }

    return baseUrl + '?' + updatedParts.join('&');
  } catch (error) {
    console.error('[AtomSvcParser] Error applying dynamic dates:', error);
    // Return original URL if processing fails
    return url;
  }
}

/**
 * Parameters in detail feed URLs that contain the project ID placeholder
 * These all need to be replaced with the actual project ID when fetching details
 */
const PROJECT_ID_PARAMETERS = [
  'ProjectNo',
  'Project_No',
  'ProjectID',
  'Project_ID',
  'ProjectId',
  'Project_Id',
  'PM_Project_RecID',  // ConnectWise internal project record ID
  'Project_RecID',
  'ProjectRecID',
];

/**
 * Create a detail feed URL for a specific project
 *
 * Takes a detail feed URL template (from an imported ATOMSVC) and substitutes
 * the project ID parameter with the actual project ID.
 *
 * @param detailFeedUrl The detail feed URL template
 * @param projectId The project ID to substitute
 * @returns URL with the project ID substituted
 */
export function createDetailFeedUrl(detailFeedUrl: string, projectId: string): string {
  try {
    const urlObj = new URL(detailFeedUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // Parse query string
    const queryString = urlObj.search.substring(1);
    const parts = queryString.split('&');

    const updatedParts: string[] = [];
    let projectIdFound = false;

    for (const part of parts) {
      if (!part) continue;

      const eqIndex = part.indexOf('=');
      if (eqIndex === -1) {
        // No = sign, keep as-is (likely report path)
        updatedParts.push(part);
        continue;
      }

      const key = part.substring(0, eqIndex);
      const decodedKey = decodeURIComponent(key);

      // Skip rc:ItemPath - this parameter specifies a specific data region (tablix)
      // which may be empty. Removing it returns all data or the default region.
      if (decodedKey.toLowerCase() === 'rc:itempath') {
        console.log(`[AtomSvcParser] Removing rc:ItemPath parameter to get all data regions`);
        continue;
      }

      // Check if this is a project ID parameter
      const isProjectIdParam = PROJECT_ID_PARAMETERS.some(p =>
        p.toLowerCase() === key.toLowerCase()
      );

      if (isProjectIdParam) {
        // Replace with our project ID
        updatedParts.push(`${key}=${encodeURIComponent(projectId)}`);
        projectIdFound = true;
      } else {
        updatedParts.push(part);
      }
    }

    if (!projectIdFound) {
      console.warn(`[AtomSvcParser] No project ID parameter found in detail feed URL`);
    }

    return baseUrl + '?' + updatedParts.join('&');
  } catch (error) {
    console.error('[AtomSvcParser] Error creating detail feed URL:', error);
    return detailFeedUrl;
  }
}
