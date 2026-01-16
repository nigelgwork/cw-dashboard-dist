/**
 * Detail Field Name Mapping
 *
 * Maps raw SSRS field names to human-readable display names.
 * Field names come from SSRS report tablixes in format: Tablix##_FieldName
 */

// Known field mappings - keys are the base field names (without Tablix prefix)
const KNOWN_FIELD_MAPPINGS: Record<string, string> = {
  // Overview fields
  Company: 'Company',
  Name: 'Name',
  Status: 'Status',
  End_Date: 'End Date',
  EndDate: 'End Date',
  ReportTitle: 'Report Title',

  // Financial Summary fields
  Quoted: 'Quoted',
  Estimated_Cost: 'Estimated Cost',
  EstimatedCost: 'Estimated Cost',
  Budget_Margin: 'Budget Margin',
  BudgetMargin: 'Budget Margin',
  Actual_Cost: 'Actual Cost',
  ActualCost: 'Actual Cost',
  Pct_Cost_Used: '% Cost Used',
  PctCostUsed: '% Cost Used',
  Committed_Cost: 'Committed Cost',
  CommittedCost: 'Committed Cost',
  Billable: 'Billable',
  Invoiced: 'Invoiced',
  WIP: 'WIP',
  WIP21: 'WIP',
  CIA: 'CIA',
  CIA_Remaining: 'CIA',
  Pct_Invoiced: '% Invoiced',
  PctInvoiced: '% Invoiced',
  Current_Margin: 'Current Margin',
  CurrentMargin: 'Current Margin',
  Variance: 'Variance',
  Standing_Margin: 'Standing Margin',
  StandingMargin: 'Standing Margin',
  Standing_Profit: 'Standing Profit',
  StandingProfit: 'Standing Profit',
  Time_Billable: 'Time Billable',
  TimeBillable: 'Time Billable',
  Products_Billable: 'Products Billable',
  ProductsBillable: 'Products Billable',
  Expenses_Billable: 'Expenses Billable',
  ExpensesBillable: 'Expenses Billable',

  // Financial Metrics (EVM)
  Total_Budget: 'Total Budget',
  TotalBudget: 'Total Budget',
  Pct_Complete: '% Complete',
  PctComplete: '% Complete',
  Percent_Complete: '% Complete',
  Planned_Value: 'Planned Value (PV)',
  PlannedValue: 'Planned Value (PV)',
  PV: 'Planned Value (PV)',
  Earned_Value: 'Earned Value (EV)',
  EarnedValue: 'Earned Value (EV)',
  EV: 'Earned Value (EV)',
  Actual_Cost_AC: 'Actual Cost (AC)',
  AC: 'Actual Cost (AC)',
  Schedule_Variance: 'Schedule Variance (SV)',
  ScheduleVariance: 'Schedule Variance (SV)',
  SV: 'Schedule Variance (SV)',
  Schedule_Performance_Index: 'Schedule Performance Index (SPI)',
  SchedulePerformanceIndex: 'Schedule Performance Index (SPI)',
  SPI: 'Schedule Performance Index (SPI)',
  Cost_Variance: 'Cost Variance (CV)',
  CostVariance: 'Cost Variance (CV)',
  CV: 'Cost Variance (CV)',
  Cost_Price_Index: 'Cost Price Index (CPI)',
  CostPriceIndex: 'Cost Price Index (CPI)',
  CPI: 'Cost Price Index (CPI)',
  Estimate_at_Completion: 'Estimate at Completion (EAC)',
  EstimateAtCompletion: 'Estimate at Completion (EAC)',
  EAC: 'Estimate at Completion (EAC)',
  Estimate_to_Complete: 'Estimate to Complete (ETC)',
  EstimateToComplete: 'Estimate to Complete (ETC)',
  ETC: 'Estimate to Complete (ETC)',
  Variance_at_Completion: 'Variance at Completion (VAC)',
  VarianceAtCompletion: 'Variance at Completion (VAC)',
  VAC: 'Variance at Completion (VAC)',
  To_Complete_Performance_Index: 'To Complete Performance Index (TCPI)',
  ToCompletePerformanceIndex: 'To Complete Performance Index (TCPI)',
  TCPI: 'To Complete Performance Index (TCPI)',

  // Hours Summary fields
  Estimated_Hours: 'Estimated Hours',
  EstimatedHours: 'Estimated Hours',
  Hours_Budget: 'Estimated Hours',
  HoursBudget: 'Estimated Hours',
  Actual_Hours: 'Actual Hours',
  ActualHours: 'Actual Hours',
  Hours_Actual: 'Actual Hours',
  HoursActual: 'Actual Hours',
  Hours_Remaining: 'Hours Remaining',
  HoursRemaining: 'Hours Remaining',
  Pct_Used: '% Used',
  PctUsed: '% Used',
  Avg_Hr_Cost: 'Avg Hr Cost',
  AvgHrCost: 'Avg Hr Cost',
  Average_Hour_Cost: 'Avg Hr Cost',

  // Cost Summary fields
  Estimated_Costs: 'Estimated Costs',
  EstimatedCosts: 'Estimated Costs',

  // Products fields
  Received: 'Received',
  PO_Number: 'PO Number',
  PONumber: 'PO Number',
  Item_Id: 'Item Id',
  ItemId: 'Item Id',
  Item_Desc: 'Item Desc',
  ItemDesc: 'Item Desc',
  Date_Received: 'Date Received',
  DateReceived: 'Date Received',
  Quantity: 'Quantity',
  Quantity_Received: 'Quantity Received',
  QuantityReceived: 'Quantity Received',
  Unit_Cost: 'Unit Cost',
  UnitCost: 'Unit Cost',
  Qty_Picked: 'Qty Picked',
  QtyPicked: 'Qty Picked',
  Total_Cost: 'Total Cost',
  TotalCost: 'Total Cost',
  Balance_to_Receive: 'Balance to Receive',
  BalanceToReceive: 'Balance to Receive',
  Billable_Amt: 'Billable Amt',
  BillableAmt: 'Billable Amt',

  // Expense fields
  Expense_Type: 'Expense Type',
  ExpenseType: 'Expense Type',
  Date_Expense: 'Date Expense',
  DateExpense: 'Date Expense',
  Note: 'Note',
  Notes: 'Notes',
  Billable_Flag: 'Billable Flag',
  BillableFlag: 'Billable Flag',
  Expense_Cost: 'Expense Cost',
  ExpenseCost: 'Expense Cost',
  Non_Billable_Amt: 'Non Billable Amt',
  NonBillableAmt: 'Non Billable Amt',

  // Invoice fields
  Date_Invoice: 'Date Invoice',
  DateInvoice: 'Date Invoice',
  Invoice_Number: 'Invoice Number',
  InvoiceNumber: 'Invoice Number',
  Project_ID: 'Project ID',
  ProjectID: 'Project ID',
  AGR_Header_Rec_ID: 'AGR Header Rec ID',
  AGRHeaderRecID: 'AGR Header Rec ID',
  Apply_To: 'Apply To',
  ApplyTo: 'Apply To',
  Invoice_Amount: 'Invoice Amount',
  InvoiceAmount: 'Invoice Amount',
  Service_Amount: 'Service Amount',
  ServiceAmount: 'Service Amount',
  Hardware_Amount: 'Hardware Amount',
  HardwareAmount: 'Hardware Amount',
  Down_Payment: 'Down Payment',
  DownPayment: 'Down Payment',
  Due_Date: 'Due Date',
  DueDate: 'Due Date',
  Paid_Flag: 'Paid Flag',
  PaidFlag: 'Paid Flag',

  // Role/Time fields
  Work_Role: 'Work Role',
  WorkRole: 'Work Role',
  Time: 'Time',
  Resource: 'Resource',

  // Common fields
  Start_Date: 'Start Date',
  StartDate: 'Start Date',
  Project_Manager: 'Project Manager',
  ProjectManager: 'Project Manager',
  Location: 'Location',
  Board: 'Board',
  Type: 'Type',
  Priority: 'Priority',
  Description: 'Description',
  Summary: 'Summary',

  // Revenue fields
  Actual_Revenue: 'Actual Revenue',
  ActualRevenue: 'Actual Revenue',
  Estimated_Revenue: 'Estimated Revenue',
  EstimatedRevenue: 'Estimated Revenue',
  Est_Cost_to_Complete: 'Est. Cost to Complete',
  Labour_Cost: 'Labour Cost',
  LabourCost: 'Labour Cost',
  Material_Cost: 'Material Cost',
  MaterialCost: 'Material Cost',

  // RowCount fields
  RowCount: 'Row Count',
};

// Tablix category names for grouping in the UI
const TABLIX_CATEGORIES: Record<string, string> = {
  Tablix1: 'Overview',
  Tablix2: 'Financial Summary',
  Tablix3: 'Financial Metrics',
  Tablix4: 'Hours Summary',
  Tablix5: 'Cost Summary',
  Tablix6: 'Cost Summary (H/W + Expenses)',
  Tablix7: 'Products',
  Tablix8: 'Time Entries',
  Tablix9: 'Expense',
  Tablix10: 'Expenses',
  Tablix11: 'Invoices',
  Tablix12: 'Invoice Details',
  Tablix13: 'Schedule',
  Tablix14: 'Tickets',
  Tablix15: 'Hours Summary',
  Tablix16: 'Hours by Role',
  Tablix17: 'Resource Hours',
  Tablix18: 'Phase Summary',
  Tablix19: 'Milestones',
  Tablix20: 'Notes',
  Tablix21: 'Additional Info',
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
  const { tablix, baseName } = parseFieldName(rawName);

  // Check known mapping for base name
  let displayName = KNOWN_FIELD_MAPPINGS[baseName];

  // If not found, handle special cases
  if (!displayName) {
    // Handle Textbox## pattern - these are typically computed/label fields
    const textboxMatch = baseName.match(/^Textbox(\d+)$/i);
    if (textboxMatch) {
      const num = parseInt(textboxMatch[1], 10);
      // Give them generic but meaningful names
      displayName = `Computed Field ${num}`;
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
