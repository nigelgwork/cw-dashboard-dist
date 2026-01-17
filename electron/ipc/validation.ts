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
];

export function validateSettingKey(key: unknown): string {
  const keyStr = validateString(key, 'key');
  if (!ALLOWED_SETTING_KEYS.includes(keyStr)) {
    throw new Error(`Invalid setting key: ${keyStr}`);
  }
  return keyStr;
}
