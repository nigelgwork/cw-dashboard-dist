/**
 * IPC Input Validation Helpers
 *
 * Provides validation functions for IPC handler inputs to prevent
 * invalid data from reaching service layer.
 */

/**
 * Validate that a value is a positive integer (database ID)
 */
export function validateId(value: unknown, fieldName = 'id'): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${fieldName}: must be a positive integer`);
  }
  return value;
}

/**
 * Validate that a value is a string
 */
export function validateString(value: unknown, fieldName = 'value'): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
  return value;
}

/**
 * Validate that a value is a non-empty string
 */
export function validateNonEmptyString(value: unknown, fieldName = 'value'): string {
  const str = validateString(value, fieldName);
  if (str.trim().length === 0) {
    throw new Error(`Invalid ${fieldName}: must not be empty`);
  }
  return str;
}

/**
 * Validate that a value is a valid sync type
 */
export function validateSyncType(value: unknown): 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'ALL' {
  const validTypes = ['PROJECTS', 'OPPORTUNITIES', 'SERVICE_TICKETS', 'ALL'];
  if (typeof value !== 'string' || !validTypes.includes(value)) {
    throw new Error(`Invalid sync type: must be one of ${validTypes.join(', ')}`);
  }
  return value as 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'ALL';
}

/**
 * Validate that a value is a valid feed type
 */
export function validateFeedType(value: unknown): 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' {
  const validTypes = ['PROJECTS', 'OPPORTUNITIES', 'SERVICE_TICKETS', 'PROJECT_DETAIL'];
  if (typeof value !== 'string' || !validTypes.includes(value)) {
    throw new Error(`Invalid feed type: must be one of ${validTypes.join(', ')}`);
  }
  return value as 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL';
}

/**
 * Validate optional query options
 */
export function validateQueryOptions(options: unknown): Record<string, unknown> | undefined {
  if (options === undefined || options === null) {
    return undefined;
  }
  if (typeof options !== 'object') {
    throw new Error('Invalid options: must be an object');
  }
  return options as Record<string, unknown>;
}

/**
 * Validate feed update options
 */
export function validateFeedUpdateOptions(updates: unknown): { name?: string; feedType?: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' } {
  if (typeof updates !== 'object' || updates === null) {
    throw new Error('Invalid updates: must be an object');
  }

  const result: { name?: string; feedType?: 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' } = {};
  const obj = updates as Record<string, unknown>;

  if ('name' in obj && obj.name !== undefined) {
    result.name = validateNonEmptyString(obj.name, 'name');
  }

  if ('feedType' in obj && obj.feedType !== undefined) {
    result.feedType = validateFeedType(obj.feedType);
  }

  return result;
}

/**
 * Validate setting key against allowed keys
 */
const ALLOWED_SETTING_KEYS = [
  'sync_interval_minutes',
  'auto_sync_enabled',
  'last_update_check',
  'skip_version',
  'window_bounds',
  'theme',
  'github_token',
  'date_lookback_days',
  'adaptive_sync_enabled',
  'project_detail_visible_fields',
  'sync_locations',
  'last_run_version',
  // Cloud database settings
  'cloud_db_connection_string',
  'cloud_db_enabled',
  'cloud_db_last_connected',
];

export function validateSettingKey(key: unknown): string {
  const keyStr = validateString(key, 'key');
  if (!ALLOWED_SETTING_KEYS.includes(keyStr)) {
    throw new Error(`Invalid setting key: ${keyStr}`);
  }
  return keyStr;
}

/**
 * Validate quotation status
 */
export function validateQuotationStatus(value: unknown): 'draft' | 'sent' | 'follow_up' | 'won' | 'lost' {
  const validStatuses = ['draft', 'sent', 'follow_up', 'won', 'lost'];
  if (typeof value !== 'string' || !validStatuses.includes(value)) {
    throw new Error(`Invalid quotation status: must be one of ${validStatuses.join(', ')}`);
  }
  return value as 'draft' | 'sent' | 'follow_up' | 'won' | 'lost';
}

/**
 * Validate priority
 */
export function validatePriority(value: unknown): 'low' | 'medium' | 'high' | 'urgent' {
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (typeof value !== 'string' || !validPriorities.includes(value)) {
    throw new Error(`Invalid priority: must be one of ${validPriorities.join(', ')}`);
  }
  return value as 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Validate task status
 */
export function validateTaskStatus(value: unknown): 'todo' | 'in_progress' | 'review' | 'done' | 'blocked' {
  const validStatuses = ['todo', 'in_progress', 'review', 'done', 'blocked'];
  if (typeof value !== 'string' || !validStatuses.includes(value)) {
    throw new Error(`Invalid task status: must be one of ${validStatuses.join(', ')}`);
  }
  return value as 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
}

/**
 * Validate optional number
 */
export function validateOptionalNumber(value: unknown, fieldName = 'value'): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Invalid ${fieldName}: must be a number`);
  }
  return value;
}

/**
 * Validate optional string
 */
export function validateOptionalString(value: unknown, fieldName = 'value'): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
  return value;
}

/**
 * Validate employee data for create/update
 */
export function validateEmployeeData(data: unknown): {
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  role?: string;
  department?: string;
  color?: string;
  avatarUrl?: string;
  isSenior?: boolean;
  isActive?: boolean;
  sortOrder?: number;
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid employee data: must be an object');
  }

  const obj = data as Record<string, unknown>;

  return {
    firstName: validateNonEmptyString(obj.firstName, 'firstName'),
    lastName: validateNonEmptyString(obj.lastName, 'lastName'),
    displayName: validateOptionalString(obj.displayName, 'displayName') ?? undefined,
    email: validateOptionalString(obj.email, 'email') ?? undefined,
    role: validateOptionalString(obj.role, 'role') ?? undefined,
    department: validateOptionalString(obj.department, 'department') ?? undefined,
    color: validateOptionalString(obj.color, 'color') ?? undefined,
    avatarUrl: validateOptionalString(obj.avatarUrl, 'avatarUrl') ?? undefined,
    isSenior: typeof obj.isSenior === 'boolean' ? obj.isSenior : undefined,
    isActive: typeof obj.isActive === 'boolean' ? obj.isActive : undefined,
    sortOrder: validateOptionalNumber(obj.sortOrder, 'sortOrder') ?? undefined,
  };
}

type QuotationStatus = 'draft' | 'sent' | 'follow_up' | 'won' | 'lost';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Validate quotation data for create/update
 */
export function validateQuotationData(data: unknown): {
  reference?: string;
  clientName: string;
  projectName?: string;
  description?: string;
  value?: number;
  assignedTo?: number;
  status?: QuotationStatus;
  priority?: Priority;
  dueDate?: string;
  sentDate?: string;
  followUpDate?: string;
  probability?: number;
  notes?: string;
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid quotation data: must be an object');
  }

  const obj = data as Record<string, unknown>;

  return {
    reference: validateOptionalString(obj.reference, 'reference') ?? undefined,
    clientName: validateNonEmptyString(obj.clientName, 'clientName'),
    projectName: validateOptionalString(obj.projectName, 'projectName') ?? undefined,
    description: validateOptionalString(obj.description, 'description') ?? undefined,
    value: validateOptionalNumber(obj.value, 'value') ?? undefined,
    assignedTo: validateOptionalNumber(obj.assignedTo, 'assignedTo') ?? undefined,
    status: obj.status !== undefined ? validateQuotationStatus(obj.status) : undefined,
    priority: obj.priority !== undefined ? validatePriority(obj.priority) : undefined,
    dueDate: validateOptionalString(obj.dueDate, 'dueDate') ?? undefined,
    sentDate: validateOptionalString(obj.sentDate, 'sentDate') ?? undefined,
    followUpDate: validateOptionalString(obj.followUpDate, 'followUpDate') ?? undefined,
    probability: validateOptionalNumber(obj.probability, 'probability') ?? undefined,
    notes: validateOptionalString(obj.notes, 'notes') ?? undefined,
  };
}

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Validate resource task data for create/update
 */
export function validateResourceTaskData(data: unknown): {
  employeeId?: number;
  projectExternalId?: string;
  clientName?: string;
  projectName?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  estimatedHours?: number;
  percentComplete?: number;
  sortOrder?: number;
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid resource task data: must be an object');
  }

  const obj = data as Record<string, unknown>;

  return {
    employeeId: validateOptionalNumber(obj.employeeId, 'employeeId') ?? undefined,
    projectExternalId: validateOptionalString(obj.projectExternalId, 'projectExternalId') ?? undefined,
    clientName: validateOptionalString(obj.clientName, 'clientName') ?? undefined,
    projectName: validateOptionalString(obj.projectName, 'projectName') ?? undefined,
    description: validateOptionalString(obj.description, 'description') ?? undefined,
    priority: obj.priority !== undefined ? (validatePriority(obj.priority) as TaskPriority) : undefined,
    status: obj.status !== undefined ? validateTaskStatus(obj.status) : undefined,
    dueDate: validateOptionalString(obj.dueDate, 'dueDate') ?? undefined,
    estimatedHours: validateOptionalNumber(obj.estimatedHours, 'estimatedHours') ?? undefined,
    percentComplete: validateOptionalNumber(obj.percentComplete, 'percentComplete') ?? undefined,
    sortOrder: validateOptionalNumber(obj.sortOrder, 'sortOrder') ?? undefined,
  };
}

/**
 * Validate team data for create/update
 */
export function validateTeamData(data: unknown): {
  name: string;
  color?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
} {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid team data: must be an object');
  }

  const obj = data as Record<string, unknown>;

  return {
    name: validateNonEmptyString(obj.name, 'name'),
    color: validateOptionalString(obj.color, 'color') ?? undefined,
    description: validateOptionalString(obj.description, 'description') ?? undefined,
    sortOrder: validateOptionalNumber(obj.sortOrder, 'sortOrder') ?? undefined,
    isActive: typeof obj.isActive === 'boolean' ? obj.isActive : undefined,
  };
}
