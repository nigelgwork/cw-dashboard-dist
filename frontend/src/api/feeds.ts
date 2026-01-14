import { AtomFeed, AtomFeedAPI, transformAtomFeed, FeedType } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface FeedUploadResult {
  message: string;
  feeds: AtomFeed[];
  syncsTriggered: number[];
}

interface FeedUploadResultAPI {
  message: string;
  feeds: AtomFeedAPI[];
  syncs_triggered: number[];
}

export const feedsApi = {
  getAll: async (): Promise<AtomFeed[]> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/feeds/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch feeds' }));
      throw new Error(errorData.detail || 'Failed to fetch feeds');
    }

    const data: AtomFeedAPI[] = await response.json();
    return data.map(transformAtomFeed);
  },

  getByType: async (feedType: FeedType): Promise<AtomFeed | null> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/feeds/type/${feedType}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch feed' }));
      throw new Error(errorData.detail || 'Failed to fetch feed');
    }

    const data: AtomFeedAPI = await response.json();
    return transformAtomFeed(data);
  },

  getActiveUrl: async (feedType: FeedType): Promise<string | null> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/feeds/active/${feedType}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch feed URL' }));
      throw new Error(errorData.detail || 'Failed to fetch feed URL');
    }

    const data = await response.json();
    return data.feed_url;
  },

  upload: async (file: File, triggerSync: boolean = true): Promise<FeedUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = API_BASE_URL || window.location.origin;
    const url = new URL(`${baseUrl}/api/v1/feeds/upload/`);
    url.searchParams.set('trigger_sync', String(triggerSync));

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser will set it with boundary
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to upload feed' }));
      throw new Error(errorData.detail || 'Failed to upload feed');
    }

    const data: FeedUploadResultAPI = await response.json();
    return {
      message: data.message,
      feeds: data.feeds.map(transformAtomFeed),
      syncsTriggered: data.syncs_triggered,
    };
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/feeds/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to delete feed' }));
      throw new Error(errorData.detail || 'Failed to delete feed');
    }
  },

  test: async (id: number): Promise<{ status: string; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/v1/feeds/${id}/test/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to test feed' }));
      throw new Error(errorData.detail || 'Failed to test feed');
    }

    return response.json();
  },
};
