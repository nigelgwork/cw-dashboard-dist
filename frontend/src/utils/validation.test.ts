import { describe, it, expect } from 'vitest';

/**
 * Tests for IPC validation logic
 * These mirror the validation functions used in the Electron main process
 */

// Validation functions (mirrored from electron/ipc/validation.ts for testing)
function validateId(value: unknown, fieldName = 'id'): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid ${fieldName}: must be a positive integer`);
  }
  return value;
}

function validateString(value: unknown, fieldName = 'value'): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
  return value;
}

function validateNonEmptyString(value: unknown, fieldName = 'value'): string {
  const str = validateString(value, fieldName);
  if (str.trim().length === 0) {
    throw new Error(`Invalid ${fieldName}: must not be empty`);
  }
  return str;
}

function validateSyncType(value: unknown): 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'ALL' {
  const validTypes = ['PROJECTS', 'OPPORTUNITIES', 'SERVICE_TICKETS', 'ALL'];
  if (typeof value !== 'string' || !validTypes.includes(value)) {
    throw new Error(`Invalid sync type: must be one of ${validTypes.join(', ')}`);
  }
  return value as 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'ALL';
}

function validateFeedType(value: unknown): 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL' {
  const validTypes = ['PROJECTS', 'OPPORTUNITIES', 'SERVICE_TICKETS', 'PROJECT_DETAIL'];
  if (typeof value !== 'string' || !validTypes.includes(value)) {
    throw new Error(`Invalid feed type: must be one of ${validTypes.join(', ')}`);
  }
  return value as 'PROJECTS' | 'OPPORTUNITIES' | 'SERVICE_TICKETS' | 'PROJECT_DETAIL';
}

describe('IPC Validation', () => {
  describe('validateId', () => {
    it('accepts positive integers', () => {
      expect(validateId(1)).toBe(1);
      expect(validateId(100)).toBe(100);
      expect(validateId(999999)).toBe(999999);
    });

    it('rejects zero', () => {
      expect(() => validateId(0)).toThrow('Invalid id: must be a positive integer');
    });

    it('rejects negative numbers', () => {
      expect(() => validateId(-1)).toThrow('Invalid id: must be a positive integer');
      expect(() => validateId(-100)).toThrow('Invalid id: must be a positive integer');
    });

    it('rejects non-integers', () => {
      expect(() => validateId(1.5)).toThrow('Invalid id: must be a positive integer');
      expect(() => validateId(0.1)).toThrow('Invalid id: must be a positive integer');
    });

    it('rejects non-numbers', () => {
      expect(() => validateId('1')).toThrow('Invalid id: must be a positive integer');
      expect(() => validateId(null)).toThrow('Invalid id: must be a positive integer');
      expect(() => validateId(undefined)).toThrow('Invalid id: must be a positive integer');
      expect(() => validateId({})).toThrow('Invalid id: must be a positive integer');
    });

    it('uses custom field name in error message', () => {
      expect(() => validateId('x', 'projectId')).toThrow('Invalid projectId: must be a positive integer');
    });
  });

  describe('validateString', () => {
    it('accepts strings', () => {
      expect(validateString('')).toBe('');
      expect(validateString('hello')).toBe('hello');
      expect(validateString('  spaces  ')).toBe('  spaces  ');
    });

    it('rejects non-strings', () => {
      expect(() => validateString(123)).toThrow('Invalid value: must be a string');
      expect(() => validateString(null)).toThrow('Invalid value: must be a string');
      expect(() => validateString(undefined)).toThrow('Invalid value: must be a string');
      expect(() => validateString({})).toThrow('Invalid value: must be a string');
      expect(() => validateString([])).toThrow('Invalid value: must be a string');
    });

    it('uses custom field name in error message', () => {
      expect(() => validateString(123, 'filename')).toThrow('Invalid filename: must be a string');
    });
  });

  describe('validateNonEmptyString', () => {
    it('accepts non-empty strings', () => {
      expect(validateNonEmptyString('hello')).toBe('hello');
      expect(validateNonEmptyString('  hello  ')).toBe('  hello  ');
    });

    it('rejects empty strings', () => {
      expect(() => validateNonEmptyString('')).toThrow('Invalid value: must not be empty');
    });

    it('rejects whitespace-only strings', () => {
      expect(() => validateNonEmptyString('   ')).toThrow('Invalid value: must not be empty');
      expect(() => validateNonEmptyString('\t\n')).toThrow('Invalid value: must not be empty');
    });

    it('rejects non-strings', () => {
      expect(() => validateNonEmptyString(123)).toThrow('Invalid value: must be a string');
    });
  });

  describe('validateSyncType', () => {
    it('accepts valid sync types', () => {
      expect(validateSyncType('PROJECTS')).toBe('PROJECTS');
      expect(validateSyncType('OPPORTUNITIES')).toBe('OPPORTUNITIES');
      expect(validateSyncType('SERVICE_TICKETS')).toBe('SERVICE_TICKETS');
      expect(validateSyncType('ALL')).toBe('ALL');
    });

    it('rejects invalid sync types', () => {
      expect(() => validateSyncType('INVALID')).toThrow('Invalid sync type');
      expect(() => validateSyncType('projects')).toThrow('Invalid sync type'); // case sensitive
      expect(() => validateSyncType('')).toThrow('Invalid sync type');
    });

    it('rejects non-strings', () => {
      expect(() => validateSyncType(123)).toThrow('Invalid sync type');
      expect(() => validateSyncType(null)).toThrow('Invalid sync type');
    });
  });

  describe('validateFeedType', () => {
    it('accepts valid feed types', () => {
      expect(validateFeedType('PROJECTS')).toBe('PROJECTS');
      expect(validateFeedType('OPPORTUNITIES')).toBe('OPPORTUNITIES');
      expect(validateFeedType('SERVICE_TICKETS')).toBe('SERVICE_TICKETS');
      expect(validateFeedType('PROJECT_DETAIL')).toBe('PROJECT_DETAIL');
    });

    it('rejects invalid feed types', () => {
      expect(() => validateFeedType('INVALID')).toThrow('Invalid feed type');
      expect(() => validateFeedType('ALL')).toThrow('Invalid feed type'); // ALL is not a feed type
    });
  });
});
