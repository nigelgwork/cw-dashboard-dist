/**
 * Native Sync Service
 *
 * Fetches ATOM feeds using Electron's session.fetch (supports Windows Auth/NTLM)
 * and syncs data to SQLite using better-sqlite3.
 *
 * This replaces the PowerShell-based sync for better portability.
 */

import { session } from 'electron';
import { parseStringPromise } from 'xml2js';
import { getDatabase } from '../database/connection';
import { ProjectRow, OpportunityRow, ServiceTicketRow } from '../database/schema';
import { applyDynamicDates } from './atomsvc-parser';
import { getDateLookbackDays } from './settings';

export interface SyncResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  error?: string;
}

interface AtomEntry {
  [key: string]: string;
}

/**
 * Fetch ATOM feed using Electron's session.fetch (supports Windows Integrated Auth/NTLM)
 */
export async function fetchAtomFeed(url: string): Promise<string> {
  console.log(`[NativeSync] Fetching URL (length: ${url.length}):`);
  console.log(`[NativeSync] URL: ${url.substring(0, 500)}${url.length > 500 ? '...' : ''}`);

  try {
    // Use session.defaultSession.fetch which integrates with NTLM credentials
    const response = await session.defaultSession.fetch(url, {
      method: 'GET',
      credentials: 'include', // Include Windows credentials for NTLM
    });

    console.log(`[NativeSync] Response status: ${response.status}`);
    console.log(`[NativeSync] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[NativeSync] Full error response (${errorText.length} bytes):`);
      console.error(errorText);

      // Try to extract meaningful error from SSRS HTML response
      const errorMatch = errorText.match(/<div[^>]*class="[^"]*rsDetailedMessageDiv[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         errorText.match(/<span[^>]*class="[^"]*rsErrorMessage[^"]*"[^>]*>([\s\S]*?)<\/span>/i) ||
                         errorText.match(/<b>Exception Details:<\/b>([\s\S]*?)<br\s*\/?>/i) ||
                         errorText.match(/<p>(rsProcessingAborted|rsErrorExecutingCommand|rsReportNotReady)[\s\S]*?<\/p>/i);

      const extractedError = errorMatch ? errorMatch[1].replace(/<[^>]*>/g, '').trim() : null;

      throw new Error(`HTTP ${response.status}: ${extractedError || errorText.substring(0, 500)}`);
    }

    const responseData = await response.text();
    console.log(`[NativeSync] Received ${responseData.length} bytes`);
    return responseData;
  } catch (error) {
    console.error(`[NativeSync] Request error:`, error);
    throw error;
  }
}

/**
 * Parse ATOM feed XML into array of entries
 */
export async function parseAtomFeed(xmlContent: string): Promise<AtomEntry[]> {
  // Strip BOM and clean XML
  const cleanedXml = xmlContent
    .replace(/^\uFEFF/, '')
    .replace(/^\uFFFE/, '')
    .trim();

  const result = await parseStringPromise(cleanedXml, {
    explicitArray: false,
    ignoreAttrs: false,
    tagNameProcessors: [(name) => name.replace(/^[a-z]:/, '')], // Remove namespace prefixes
  });

  const entries: AtomEntry[] = [];

  // Navigate to entries - handle both array and single entry cases
  const feed = result.feed;
  if (!feed?.entry) {
    console.log('[NativeSync] No entries found in feed');
    return entries;
  }

  const entryList = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

  for (const entry of entryList) {
    // Extract properties from content/properties
    const props = entry.content?.properties;
    if (!props) continue;

    const record: AtomEntry = {};

    // Flatten all properties
    for (const [key, value] of Object.entries(props)) {
      if (value && typeof value === 'object') {
        // Handle complex value with _ for text content
        record[key] = (value as { _?: string })._ || '';
      } else {
        record[key] = String(value || '');
      }
    }

    entries.push(record);
  }

  console.log(`[NativeSync] Parsed ${entries.length} entries from feed`);
  return entries;
}

/**
 * Sync projects from ATOM feed to SQLite
 */
export async function syncProjects(
  feedUrl: string,
  syncHistoryId: number
): Promise<SyncResult> {
  const db = getDatabase();

  try {
    // Apply dynamic dates to URL before fetching
    const lookbackDays = getDateLookbackDays();
    const dynamicUrl = applyDynamicDates(feedUrl, lookbackDays);

    // Fetch the feed
    const xmlContent = await fetchAtomFeed(dynamicUrl);

    // Parse entries
    const entries = await parseAtomFeed(xmlContent);

    if (entries.length === 0) {
      return {
        success: true,
        total: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    // Log sample entry for debugging
    console.log('[NativeSync] Sample entry keys:', Object.keys(entries[0]));

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    const insertStmt = db.prepare(`
      INSERT INTO projects (external_id, client_name, project_name, budget, spent, hours_estimate, hours_remaining, status, is_active, notes, updated_at)
      VALUES (@external_id, @client_name, @project_name, @budget, @spent, @hours_estimate, @hours_remaining, @status, @is_active, @notes, datetime('now'))
    `);

    const updateStmt = db.prepare(`
      UPDATE projects SET
        client_name = @client_name,
        project_name = @project_name,
        budget = @budget,
        spent = @spent,
        hours_estimate = @hours_estimate,
        hours_remaining = @hours_remaining,
        status = @status,
        is_active = @is_active,
        notes = @notes,
        updated_at = datetime('now')
      WHERE external_id = @external_id
    `);

    const selectStmt = db.prepare('SELECT * FROM projects WHERE external_id = ?');

    const insertChangeStmt = db.prepare(`
      INSERT INTO sync_changes (sync_history_id, entity_type, entity_id, external_id, change_type, field_name, old_value, new_value)
      VALUES (?, 'PROJECT', ?, ?, ?, ?, ?, ?)
    `);

    // Process each entry
    for (const entry of entries) {
      try {
        const mapped = mapProjectEntry(entry);

        const existing = selectStmt.get(mapped.external_id) as ProjectRow | undefined;

        if (existing) {
          // Check for changes
          const changes = compareFields(existing, mapped, [
            'client_name',
            'project_name',
            'budget',
            'spent',
            'hours_estimate',
            'hours_remaining',
            'status',
            'is_active',
            'notes',
          ]);

          if (changes.length > 0) {
            updateStmt.run(mapped);

            // Record changes
            for (const change of changes) {
              insertChangeStmt.run(
                syncHistoryId,
                existing.id,
                mapped.external_id,
                'UPDATED',
                change.field,
                change.oldValue,
                change.newValue
              );
            }

            updated++;
          } else {
            unchanged++;
          }
        } else {
          // Insert new record
          const result = insertStmt.run(mapped);

          // Record creation
          insertChangeStmt.run(
            syncHistoryId,
            result.lastInsertRowid,
            mapped.external_id,
            'CREATED',
            null,
            null,
            null
          );

          created++;
        }
      } catch (err) {
        console.error(`[NativeSync] Error processing project entry:`, err);
      }
    }

    return {
      success: true,
      total: entries.length,
      created,
      updated,
      unchanged,
    };
  } catch (error) {
    console.error('[NativeSync] Project sync failed:', error);
    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Sync opportunities from ATOM feed to SQLite
 */
export async function syncOpportunities(
  feedUrl: string,
  syncHistoryId: number
): Promise<SyncResult> {
  const db = getDatabase();

  try {
    // Apply dynamic dates to URL before fetching
    const lookbackDays = getDateLookbackDays();
    const dynamicUrl = applyDynamicDates(feedUrl, lookbackDays);

    // Fetch the feed
    const xmlContent = await fetchAtomFeed(dynamicUrl);

    // Parse entries
    const entries = await parseAtomFeed(xmlContent);

    if (entries.length === 0) {
      return {
        success: true,
        total: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    // Log sample entry for debugging
    console.log('[NativeSync] Sample opportunity entry keys:', Object.keys(entries[0]));

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    const insertStmt = db.prepare(`
      INSERT INTO opportunities (external_id, opportunity_name, company_name, sales_rep, stage, expected_revenue, close_date, probability, notes, raw_data, updated_at)
      VALUES (@external_id, @opportunity_name, @company_name, @sales_rep, @stage, @expected_revenue, @close_date, @probability, @notes, @raw_data, datetime('now'))
    `);

    const updateStmt = db.prepare(`
      UPDATE opportunities SET
        opportunity_name = @opportunity_name,
        company_name = @company_name,
        sales_rep = @sales_rep,
        stage = @stage,
        expected_revenue = @expected_revenue,
        close_date = @close_date,
        probability = @probability,
        notes = @notes,
        raw_data = @raw_data,
        updated_at = datetime('now')
      WHERE external_id = @external_id
    `);

    const selectStmt = db.prepare('SELECT * FROM opportunities WHERE external_id = ?');

    const insertChangeStmt = db.prepare(`
      INSERT INTO sync_changes (sync_history_id, entity_type, entity_id, external_id, change_type, field_name, old_value, new_value)
      VALUES (?, 'OPPORTUNITY', ?, ?, ?, ?, ?, ?)
    `);

    // Process each entry
    for (const entry of entries) {
      try {
        const mapped = mapOpportunityEntry(entry);

        const existing = selectStmt.get(mapped.external_id) as OpportunityRow | undefined;

        if (existing) {
          // Check for changes
          const changes = compareFields(existing, mapped, [
            'opportunity_name',
            'company_name',
            'sales_rep',
            'stage',
            'expected_revenue',
            'close_date',
            'probability',
            'notes',
          ]);

          if (changes.length > 0) {
            updateStmt.run(mapped);

            // Record changes
            for (const change of changes) {
              insertChangeStmt.run(
                syncHistoryId,
                existing.id,
                mapped.external_id,
                'UPDATED',
                change.field,
                change.oldValue,
                change.newValue
              );
            }

            updated++;
          } else {
            unchanged++;
          }
        } else {
          // Insert new record
          const result = insertStmt.run(mapped);

          // Record creation
          insertChangeStmt.run(
            syncHistoryId,
            result.lastInsertRowid,
            mapped.external_id,
            'CREATED',
            null,
            null,
            null
          );

          created++;
        }
      } catch (err) {
        console.error(`[NativeSync] Error processing opportunity entry:`, err);
      }
    }

    return {
      success: true,
      total: entries.length,
      created,
      updated,
      unchanged,
    };
  } catch (error) {
    console.error('[NativeSync] Opportunity sync failed:', error);
    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Sync service tickets from ATOM feed to SQLite
 */
export async function syncServiceTickets(
  feedUrl: string,
  syncHistoryId: number
): Promise<SyncResult> {
  const db = getDatabase();

  try {
    // Apply dynamic dates to URL before fetching
    const lookbackDays = getDateLookbackDays();
    const dynamicUrl = applyDynamicDates(feedUrl, lookbackDays);

    // Fetch the feed
    const xmlContent = await fetchAtomFeed(dynamicUrl);

    // Parse entries
    const entries = await parseAtomFeed(xmlContent);

    if (entries.length === 0) {
      return {
        success: true,
        total: 0,
        created: 0,
        updated: 0,
        unchanged: 0,
      };
    }

    // Log sample entry for debugging
    console.log('[NativeSync] Sample service ticket entry keys:', Object.keys(entries[0]));

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    const insertStmt = db.prepare(`
      INSERT INTO service_tickets (external_id, summary, status, priority, assigned_to, company_name, board_name, created_date, last_updated, due_date, hours_estimate, hours_actual, hours_remaining, budget, notes, raw_data, updated_at)
      VALUES (@external_id, @summary, @status, @priority, @assigned_to, @company_name, @board_name, @created_date, @last_updated, @due_date, @hours_estimate, @hours_actual, @hours_remaining, @budget, @notes, @raw_data, datetime('now'))
    `);

    const updateStmt = db.prepare(`
      UPDATE service_tickets SET
        summary = @summary,
        status = @status,
        priority = @priority,
        assigned_to = @assigned_to,
        company_name = @company_name,
        board_name = @board_name,
        created_date = @created_date,
        last_updated = @last_updated,
        due_date = @due_date,
        hours_estimate = @hours_estimate,
        hours_actual = @hours_actual,
        hours_remaining = @hours_remaining,
        budget = @budget,
        notes = @notes,
        raw_data = @raw_data,
        updated_at = datetime('now')
      WHERE external_id = @external_id
    `);

    const selectStmt = db.prepare('SELECT * FROM service_tickets WHERE external_id = ?');

    const insertChangeStmt = db.prepare(`
      INSERT INTO sync_changes (sync_history_id, entity_type, entity_id, external_id, change_type, field_name, old_value, new_value)
      VALUES (?, 'SERVICE_TICKET', ?, ?, ?, ?, ?, ?)
    `);

    // Process each entry
    for (const entry of entries) {
      try {
        const mapped = mapServiceTicketEntry(entry);

        const existing = selectStmt.get(mapped.external_id) as ServiceTicketRow | undefined;

        if (existing) {
          // Check for changes
          const changes = compareFields(existing, mapped, [
            'summary',
            'status',
            'priority',
            'assigned_to',
            'company_name',
            'board_name',
            'due_date',
            'hours_estimate',
            'hours_actual',
            'hours_remaining',
            'budget',
            'notes',
          ]);

          if (changes.length > 0) {
            updateStmt.run(mapped);

            // Record changes
            for (const change of changes) {
              insertChangeStmt.run(
                syncHistoryId,
                existing.id,
                mapped.external_id,
                'UPDATED',
                change.field,
                change.oldValue,
                change.newValue
              );
            }

            updated++;
          } else {
            unchanged++;
          }
        } else {
          // Insert new record
          const result = insertStmt.run(mapped);

          // Record creation
          insertChangeStmt.run(
            syncHistoryId,
            result.lastInsertRowid,
            mapped.external_id,
            'CREATED',
            null,
            null,
            null
          );

          created++;
        }
      } catch (err) {
        console.error(`[NativeSync] Error processing service ticket entry:`, err);
      }
    }

    return {
      success: true,
      total: entries.length,
      created,
      updated,
      unchanged,
    };
  } catch (error) {
    console.error('[NativeSync] Service ticket sync failed:', error);
    return {
      success: false,
      total: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Map ATOM entry to project record
 * Field mappings based on SSRS Project Manager Summary report
 */
function mapProjectEntry(entry: AtomEntry): Record<string, unknown> {
  // Try common SSRS field names - these may vary based on your report
  const externalId = entry.ID || entry.ProjectID || entry.Project_ID || entry.Id || '';
  const projectName = cleanHtmlEntities(entry.Name1 || entry.ProjectName || entry.Project_Name || entry.Name || '');
  const clientName = cleanHtmlEntities(entry.Company2 || entry.CompanyName || entry.Company || entry.Client || '');
  const projectManager = cleanHtmlEntities(entry.Project_Manager3 || entry.ProjectManager || entry.PM || '');

  // Status field - try various field names
  const rawStatus = entry.Status || entry.ProjectStatus || entry.Project_Status ||
                    entry.status_description || entry.StatusName || entry.Status_Name ||
                    entry.Textbox37 || entry.Textbox38 || ''; // Textbox37/38 are common SSRS field names for status
  const status = cleanHtmlEntities(rawStatus);

  // Determine if active based on status
  // Active statuses: "1. New", "2. In Progress", "3. Completed - Ready to Invoice", "4. On-Hold", "8. Re-Opened"
  // Inactive statuses: "6. Completed", "7. Cancelled"
  // Default to active if status is empty/unknown
  const lowerStatus = status.toLowerCase();
  const isInactive = lowerStatus.includes('completed') || lowerStatus.includes('cancelled') ||
                     lowerStatus.includes('closed');
  const isActive = !isInactive; // Default to active, only mark inactive for completed/cancelled/closed

  // Financial fields
  const budget = parseNumber(entry.Quoted3 || entry.Budget || entry.QuotedAmount);
  const spent = parseNumber(entry.Actual_Cost || entry.ActualCost || entry.Spent);
  const estimatedCost = parseNumber(entry.Estimated_Cost || entry.EstimatedCost);
  const actualCost = parseNumber(entry.Actual_Cost || entry.ActualCost);

  // Calculate hours remaining
  const remainingCost = (estimatedCost || 0) - (actualCost || 0);
  const hoursRemaining = remainingCost > 0 ? Math.round((remainingCost / 125) * 100) / 100 : 0;

  // Hours estimate from budget
  const hoursEstimate = budget && budget > 0 ? Math.round((budget / 125) * 100) / 100 : null;

  // Build notes with WIP and completion percentage
  const wip = entry.WIP1 || entry.WIP || '';
  const pctComplete = entry.Textbox232 || entry.PercentComplete || '0';
  const pctValue = Math.round((parseNumber(pctComplete) || 0) * 100 * 10) / 10;
  const notes = `PM: ${projectManager} | WIP: ${wip} | % Complete: ${pctValue}%`;

  return {
    external_id: externalId,
    client_name: clientName || null,
    project_name: projectName || null,
    budget: budget || null,
    spent: spent || null,
    hours_estimate: hoursEstimate,
    hours_remaining: hoursRemaining,
    status: status || 'Unknown',
    is_active: isActive ? 1 : 0,
    notes,
  };
}

/**
 * Map ATOM entry to opportunity record
 * Field mappings based on SSRS Opportunity report
 */
function mapOpportunityEntry(entry: AtomEntry): Record<string, unknown> {
  // Try common field names
  const externalId = entry.ID || entry.OpportunityID || entry.Opportunity_ID || entry.Id || '';
  const opportunityName = cleanHtmlEntities(entry.Name || entry.OpportunityName || entry.Opportunity_Name || '');
  const companyName = cleanHtmlEntities(entry.Company || entry.CompanyName || entry.Company_Name || '');
  const salesRep = cleanHtmlEntities(entry.SalesRep || entry.Sales_Rep || entry.Owner || entry.Rep || '');
  const stage = entry.Stage || entry.SalesStage || entry.Status || '';

  const expectedRevenue = parseNumber(entry.Revenue || entry.ExpectedRevenue || entry.Expected_Revenue || entry.Amount);
  const closeDate = entry.CloseDate || entry.Close_Date || entry.ExpectedClose || null;
  const probability = parseNumber(entry.Probability || entry.Prob || entry.WinProbability);

  // Store raw data for debugging
  const rawData = JSON.stringify(entry);

  return {
    external_id: externalId,
    opportunity_name: opportunityName || null,
    company_name: companyName || null,
    sales_rep: salesRep || null,
    stage: stage || null,
    expected_revenue: expectedRevenue || null,
    close_date: closeDate || null,
    probability: probability ? Math.round(probability * 100) : null,
    notes: null,
    raw_data: rawData,
  };
}

/**
 * Map ATOM entry to service ticket record
 * Field mappings based on SSRS Service Ticket report
 */
function mapServiceTicketEntry(entry: AtomEntry): Record<string, unknown> {
  // Log all available fields for debugging (first entry only shown in syncServiceTickets)

  // Try common field names for service tickets - matching PowerShell script field order
  const externalId = entry.TicketNbr || entry.Ticket_Number || entry.SR_RecID || entry.ID || entry.TicketID || entry.Ticket_ID || entry.Id || '';
  const summary = cleanHtmlEntities(entry.Summary || entry.Description || entry.Title || entry.Subject || '');
  // status_description is the field name from SSRS (lowercase)
  const status = entry.status_description || entry.Status_Description || entry.Status || entry.TicketStatus || entry.Ticket_Status || entry.StatusName || '';
  // Urgency is the priority field from SSRS
  const priority = entry.Urgency || entry.Priority_Description || entry.Priority || entry.PriorityName || entry.Priority_Name || '';
  // team_name is the assigned to field from SSRS
  const assignedTo = cleanHtmlEntities(entry.team_name || entry.Assigned_To || entry.AssignedTo || entry.Owner || entry.Resource || '');
  // Company_Name is the field from SSRS
  const companyName = cleanHtmlEntities(entry.Company_Name || entry.Company || entry.CompanyName || entry.Client || '');
  const boardName = entry.Board_Name || entry.Board || entry.BoardName || entry.Board_Name || entry.ServiceBoard || '';

  // Date fields - date_entered is the field from SSRS (lowercase)
  const createdDate = entry.date_entered || entry.Date_Entered || entry.Created_Date || entry.CreatedDate || entry.DateEntered || entry.OpenDate || null;
  const lastUpdated = entry.last_updated || entry.Last_Updated || entry.LastUpdated || entry.DateUpdated || entry.ModifiedDate || null;
  const dueDate = entry.DueDate || entry.Due_Date || entry.RequiredDate || entry.Deadline || null;

  // Hours/financial fields
  const hoursEstimate = parseNumber(entry.BudgetHours || entry.Budget_Hours || entry.EstimatedHours || entry.HoursEstimate);
  const hoursActual = parseNumber(entry.ActualHours || entry.Actual_Hours || entry.HoursActual || entry.WorkedHours);
  const hoursRemaining = parseNumber(entry.RemainingHours || entry.Remaining_Hours || entry.HoursRemaining);
  const budget = parseNumber(entry.Budget || entry.BudgetAmount || entry.Budget_Amount);

  // Notes
  const notes = cleanHtmlEntities(entry.Notes || entry.Comments || entry.InternalNotes || '');

  // Store raw data for debugging
  const rawData = JSON.stringify(entry);

  return {
    external_id: externalId,
    summary: summary || null,
    status: status || null,
    priority: priority || null,
    assigned_to: assignedTo || null,
    company_name: companyName || null,
    board_name: boardName || null,
    created_date: createdDate || null,
    last_updated: lastUpdated || null,
    due_date: dueDate || null,
    hours_estimate: hoursEstimate || null,
    hours_actual: hoursActual || null,
    hours_remaining: hoursRemaining || null,
    budget: budget || null,
    notes: notes || null,
    raw_data: rawData,
  };
}

/**
 * Clean HTML entities from string
 */
function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Parse number from string, handling various formats
 */
function parseNumber(value: string | undefined): number | null {
  if (!value) return null;

  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,€£]/g, '').trim();
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
}

/**
 * Compare fields between existing and new record
 */
function compareFields(
  existing: object,
  newRecord: object,
  fields: string[]
): Array<{ field: string; oldValue: string | null; newValue: string | null }> {
  const existingRec = existing as Record<string, unknown>;
  const newRec = newRecord as Record<string, unknown>;
  const changes: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

  for (const field of fields) {
    const oldVal = existingRec[field];
    const newVal = newRec[field];

    // Normalize for comparison
    const oldStr = oldVal === null || oldVal === undefined ? '' : String(oldVal);
    const newStr = newVal === null || newVal === undefined ? '' : String(newVal);

    // For numeric fields, round for comparison
    if (typeof newVal === 'number' || typeof oldVal === 'number') {
      const oldNum = parseFloat(oldStr) || 0;
      const newNum = parseFloat(newStr) || 0;

      if (Math.abs(oldNum - newNum) > 0.01) {
        changes.push({
          field,
          oldValue: oldStr || null,
          newValue: newStr || null,
        });
      }
    } else if (oldStr !== newStr) {
      changes.push({
        field,
        oldValue: oldStr || null,
        newValue: newStr || null,
      });
    }
  }

  return changes;
}

/**
 * Test feed connectivity - actually fetches and parses the feed
 */
export async function testFeedConnection(feedUrl: string): Promise<{
  success: boolean;
  recordCount?: number;
  sampleFields?: string[];
  error?: string;
}> {
  try {
    // Apply dynamic dates to URL before testing
    const lookbackDays = getDateLookbackDays();
    const dynamicUrl = applyDynamicDates(feedUrl, lookbackDays);

    const xmlContent = await fetchAtomFeed(dynamicUrl);
    const entries = await parseAtomFeed(xmlContent);

    return {
      success: true,
      recordCount: entries.length,
      sampleFields: entries.length > 0 ? Object.keys(entries[0]) : [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
