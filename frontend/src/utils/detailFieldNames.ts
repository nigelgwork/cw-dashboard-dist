/**
 * Detail Field Name Mapping
 *
 * Maps raw SSRS field names (e.g., "Tablix1_Company") to human-readable display names.
 * The raw names come from SSRS report tablixes and include:
 * - Tablix1: Project header (Company, Name, Status, End_Date)
 * - Tablix2: Financial summary (Quoted, Estimated_Cost, Actual_Cost, Billable, Invoiced, WIP21, CIA_Remaining)
 * - Tablix15: Hours summary (Hours_Budget, Hours_Actual, Hours_Remaining, %Used)
 * - Tablix16: Hours by role (Work_Role, Time)
 * - Tablix8: Time entries (totals)
 * - Tablix10: H/W + Expenses (totals)
 */

// Known field mappings - keys are the base field names (without Tablix prefix)
const KNOWN_FIELD_MAPPINGS: Record<string, string> = {
  // Common fields (appear in multiple tablixes)
  Company: 'Company',
  Name: 'Project Name',
  Status: 'Status',
  End_Date: 'End Date',
  ReportTitle: 'Report Title',

  // Financial fields (Tablix2)
  Quoted: 'Quoted Amount',
  Estimated_Cost: 'Estimated Cost',
  Actual_Cost: 'Actual Cost',
  Billable: 'Billable Amount',
  Invoiced: 'Invoiced Amount',
  WIP21: 'Work In Progress',
  CIA_Remaining: 'CIA Remaining',
  Actual_Revenue: 'Actual Revenue',
  Estimated_Revenue: 'Estimated Revenue',
  Est_Cost_to_Complete: 'Est. Cost to Complete',
  Labour_Cost: 'Labour Cost',
  Material_Cost: 'Material Cost',
  Expense_Cost: 'Expense Cost',

  // Hours fields (Tablix15)
  Hours_Budget: 'Hours Budget',
  Hours_Actual: 'Hours Actual',
  Hours_Remaining: 'Hours Remaining',
  Pct_Used: '% Hours Used',

  // Role/Time fields (Tablix16)
  Work_Role: 'Work Role',
  Time: 'Time',
  Resource: 'Resource',

  // Common variations
  Percent_Complete: '% Complete',
  Start_Date: 'Start Date',
  Due_Date: 'Due Date',
  Project_Manager: 'Project Manager',
  Location: 'Location',
  Board: 'Board',
  Type: 'Type',
  Priority: 'Priority',
  Description: 'Description',
  Summary: 'Summary',
  Notes: 'Notes',

  // RowCount fields
  RowCount: 'Row Count',

  // Common Textbox fields - these are typically labels or computed fields in SSRS
  // Format: Textbox## where ## is a number assigned by SSRS report designer
  Textbox1: 'Label 1',
  Textbox2: 'Label 2',
  Textbox3: 'Label 3',
  Textbox4: 'Label 4',
  Textbox5: 'Label 5',
  Textbox6: 'Subtotal',
  Textbox7: 'Total',
  Textbox8: 'Grand Total',
  Textbox9: 'Section Total',
  Textbox10: 'Category',
  Textbox11: 'Header',
  Textbox12: 'Footer',
  Textbox13: 'Summary Value',
  Textbox14: 'Computed Value',
  Textbox15: 'Aggregate',
  Textbox16: 'Running Total',
  Textbox17: 'Page Total',
  Textbox18: 'Group Header',
  Textbox19: 'Group Footer',
  Textbox20: 'Column Header',
  Textbox21: 'Row Header',
  Textbox22: 'Detail Value',
  Textbox23: 'Calculated Field',
  Textbox24: 'Expression',
  Textbox25: 'Formula Result',
};

/**
 * Full field mappings including the Tablix prefix
 * This allows for more specific mappings when we know exactly which field means what
 */
const FULL_FIELD_MAPPINGS: Record<string, string> = {
  // Tablix1 - Project Header fields
  'Tablix1_Company': 'Company Name',
  'Tablix1_Name': 'Project Name',
  'Tablix1_Status': 'Project Status',
  'Tablix1_End_Date': 'End Date',

  // Tablix2 - Financial Summary
  'Tablix2_Quoted': 'Quoted Amount',
  'Tablix2_Estimated_Cost': 'Estimated Cost',
  'Tablix2_Actual_Cost': 'Actual Cost',
  'Tablix2_Billable': 'Billable Amount',
  'Tablix2_Invoiced': 'Invoiced Amount',
  'Tablix2_WIP21': 'Work In Progress',
  'Tablix2_CIA_Remaining': 'CIA Remaining',

  // Tablix15 - Hours Summary
  'Tablix15_Hours_Budget': 'Budgeted Hours',
  'Tablix15_Hours_Actual': 'Actual Hours',
  'Tablix15_Hours_Remaining': 'Remaining Hours',

  // Tablix16 - Hours by Role
  'Tablix16_Work_Role': 'Role',
  'Tablix16_Time': 'Hours',
  'Tablix16_Resource': 'Resource Name',
};

// Tablix category names for grouping in the UI
const TABLIX_CATEGORIES: Record<string, string> = {
  Tablix1: 'Project Info',
  Tablix2: 'Financial',
  Tablix8: 'Time Entries',
  Tablix10: 'Expenses',
  Tablix15: 'Hours Summary',
  Tablix16: 'Hours by Role',
};

/**
 * Parse a raw field name into its components
 * e.g., "Tablix1_Company" -> { tablix: "Tablix1", baseName: "Company" }
 */
function parseFieldName(rawName: string): { tablix: string | null; baseName: string } {
  const tablixMatch = rawName.match(/^(Tablix\d+)_(.+)$/);
  if (tablixMatch) {
    return {
      tablix: tablixMatch[1],
      baseName: tablixMatch[2],
    };
  }
  return { tablix: null, baseName: rawName };
}

/**
 * Convert underscore_case to Title Case
 * e.g., "Hours_Remaining" -> "Hours Remaining"
 */
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get the display name for a raw field name
 * @param rawName The raw field name from SSRS (e.g., "Tablix1_Company")
 * @param includeCategory If true, prefix with category name for disambiguation
 * @returns Human-readable display name
 */
export function getFieldDisplayName(rawName: string, includeCategory = false): string {
  // First, check if we have a full field mapping (includes Tablix prefix)
  if (FULL_FIELD_MAPPINGS[rawName]) {
    const displayName = FULL_FIELD_MAPPINGS[rawName];
    if (includeCategory) {
      const { tablix } = parseFieldName(rawName);
      if (tablix) {
        const category = TABLIX_CATEGORIES[tablix] || tablix;
        return `${category}: ${displayName}`;
      }
    }
    return displayName;
  }

  const { tablix, baseName } = parseFieldName(rawName);

  // Check known mapping for base name
  let displayName = KNOWN_FIELD_MAPPINGS[baseName];

  // If not found, handle special cases
  if (!displayName) {
    // Handle Textbox## pattern - give them generic but cleaner names
    const textboxMatch = baseName.match(/^Textbox(\d+)$/i);
    if (textboxMatch) {
      const num = parseInt(textboxMatch[1], 10);
      // Use meaningful generic names based on common SSRS patterns
      if (num <= 5) displayName = `Label ${num}`;
      else if (num <= 10) displayName = `Value ${num}`;
      else if (num <= 20) displayName = `Field ${num}`;
      else displayName = `Data ${num}`;
    } else {
      // Convert underscore_case to Title Case
      displayName = toTitleCase(baseName);
    }
  }

  // Optionally prefix with category
  if (includeCategory && tablix) {
    const category = TABLIX_CATEGORIES[tablix] || tablix;
    return `${category}: ${displayName}`;
  }

  return displayName;
}

/**
 * Get display name with category prefix for settings UI
 * This helps users understand what section each field comes from
 */
export function getFieldDisplayNameWithCategory(rawName: string): string {
  return getFieldDisplayName(rawName, true);
}

/**
 * Get just the short display name for card display
 */
export function getFieldShortDisplayName(rawName: string): string {
  return getFieldDisplayName(rawName, false);
}

/**
 * Sort fields by category and then by display name
 * Returns fields grouped by their tablix source
 */
export function sortFieldsByCategory(fieldNames: string[]): string[] {
  return fieldNames.sort((a, b) => {
    const parsedA = parseFieldName(a);
    const parsedB = parseFieldName(b);

    // Sort by tablix first
    if (parsedA.tablix && parsedB.tablix) {
      if (parsedA.tablix !== parsedB.tablix) {
        return parsedA.tablix.localeCompare(parsedB.tablix);
      }
    } else if (parsedA.tablix && !parsedB.tablix) {
      return -1;
    } else if (!parsedA.tablix && parsedB.tablix) {
      return 1;
    }

    // Then sort by display name within category
    const displayA = getFieldDisplayName(a);
    const displayB = getFieldDisplayName(b);
    return displayA.localeCompare(displayB);
  });
}

/**
 * Get category name for a field
 */
export function getFieldCategory(rawName: string): string {
  const { tablix } = parseFieldName(rawName);
  if (tablix) {
    return TABLIX_CATEGORIES[tablix] || tablix;
  }
  return 'Other';
}

/**
 * Group fields by their category
 */
export function groupFieldsByCategory(fieldNames: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const field of fieldNames) {
    const category = getFieldCategory(field);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(field);
  }

  // Sort fields within each group
  for (const category of Object.keys(groups)) {
    groups[category].sort((a, b) => {
      const displayA = getFieldDisplayName(a);
      const displayB = getFieldDisplayName(b);
      return displayA.localeCompare(displayB);
    });
  }

  return groups;
}
