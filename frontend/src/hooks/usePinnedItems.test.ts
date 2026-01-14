import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePinnedItems } from './usePinnedItems';

const STORAGE_KEY = 'cw-dashboard-pinned';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('usePinnedItems', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('initializes with empty arrays', () => {
    const { result } = renderHook(() => usePinnedItems());

    expect(result.current.pinnedProjects).toEqual([]);
    expect(result.current.pinnedOpportunities).toEqual([]);
    expect(result.current.pinnedCount).toBe(0);
  });

  it('loads pinned items from localStorage', () => {
    localStorageMock.setItem(
      STORAGE_KEY,
      JSON.stringify({ projects: [1, 2], opportunities: [3] })
    );

    const { result } = renderHook(() => usePinnedItems());

    expect(result.current.pinnedProjects).toEqual([1, 2]);
    expect(result.current.pinnedOpportunities).toEqual([3]);
    expect(result.current.pinnedCount).toBe(3);
  });

  it('toggles pin for projects', () => {
    const { result } = renderHook(() => usePinnedItems());

    // Pin a project
    act(() => {
      result.current.togglePin('projects', 1);
    });
    expect(result.current.pinnedProjects).toContain(1);
    expect(result.current.isPinned('projects', 1)).toBe(true);

    // Unpin the project
    act(() => {
      result.current.togglePin('projects', 1);
    });
    expect(result.current.pinnedProjects).not.toContain(1);
    expect(result.current.isPinned('projects', 1)).toBe(false);
  });

  it('toggles pin for opportunities', () => {
    const { result } = renderHook(() => usePinnedItems());

    act(() => {
      result.current.togglePin('opportunities', 5);
    });
    expect(result.current.pinnedOpportunities).toContain(5);
    expect(result.current.isPinned('opportunities', 5)).toBe(true);
  });

  it('persists to localStorage on change', () => {
    const { result } = renderHook(() => usePinnedItems());

    act(() => {
      result.current.togglePin('projects', 1);
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"projects":[1]')
    );
  });

  it('handles invalid localStorage data gracefully', () => {
    localStorageMock.setItem(STORAGE_KEY, 'invalid json');

    const { result } = renderHook(() => usePinnedItems());

    expect(result.current.pinnedProjects).toEqual([]);
    expect(result.current.pinnedOpportunities).toEqual([]);
  });
});
