import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'cw-dashboard-pinned';

type ItemType = 'projects' | 'opportunities' | 'service-tickets';

interface PinnedItems {
  projects: number[];
  opportunities: number[];
  'service-tickets': number[];
}

const getStoredPins = (): PinnedItems => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle migration from old format without service-tickets
      return {
        projects: parsed.projects || [],
        opportunities: parsed.opportunities || [],
        'service-tickets': parsed['service-tickets'] || [],
      };
    }
  } catch (e) {
    console.error('Failed to load pinned items:', e);
  }
  return { projects: [], opportunities: [], 'service-tickets': [] };
};

const savePins = (pins: PinnedItems): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (e) {
    console.error('Failed to save pinned items:', e);
  }
};

export function usePinnedItems() {
  const [pinnedItems, setPinnedItems] = useState<PinnedItems>(getStoredPins);

  // Persist to localStorage whenever pinned items change
  useEffect(() => {
    savePins(pinnedItems);
  }, [pinnedItems]);

  const isPinned = useCallback(
    (type: ItemType, id: number): boolean => {
      return pinnedItems[type].includes(id);
    },
    [pinnedItems]
  );

  const togglePin = useCallback(
    (type: ItemType, id: number): void => {
      setPinnedItems((prev) => {
        const current = prev[type];
        const isCurrentlyPinned = current.includes(id);
        return {
          ...prev,
          [type]: isCurrentlyPinned
            ? current.filter((pinnedId) => pinnedId !== id)
            : [...current, id],
        };
      });
    },
    []
  );

  const getPinnedIds = useCallback(
    (type: ItemType): number[] => {
      return pinnedItems[type];
    },
    [pinnedItems]
  );

  const pinnedCount = pinnedItems.projects.length + pinnedItems.opportunities.length + pinnedItems['service-tickets'].length;

  return {
    isPinned,
    togglePin,
    getPinnedIds,
    pinnedCount,
    pinnedProjects: pinnedItems.projects,
    pinnedOpportunities: pinnedItems.opportunities,
    pinnedServiceTickets: pinnedItems['service-tickets'],
  };
}

export type UsePinnedItemsReturn = ReturnType<typeof usePinnedItems>;
