import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileUp,
  Trash2,
  PlayCircle,
  FolderKanban,
  TrendingUp,
  Ticket,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { electronFeedsApi, isElectron } from '../../api/electron-api';
import { feedsApi } from '../../api/feeds';
import { AtomFeed, FeedType } from '../../types';
import { useToast } from '../../context/ToastContext';

interface FeedTestResult {
  success: boolean;
  error?: string;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  return date.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFeedTypeIcon = (feedType: FeedType) => {
  switch (feedType) {
    case 'PROJECTS':
      return FolderKanban;
    case 'OPPORTUNITIES':
      return TrendingUp;
    case 'SERVICE_TICKETS':
      return Ticket;
    default:
      return FolderKanban;
  }
};

const getFeedTypeColor = (feedType: FeedType) => {
  switch (feedType) {
    case 'PROJECTS':
      return { text: 'text-blue-400', bg: 'bg-blue-500/20' };
    case 'OPPORTUNITIES':
      return { text: 'text-green-400', bg: 'bg-green-500/20' };
    case 'SERVICE_TICKETS':
      return { text: 'text-orange-400', bg: 'bg-orange-500/20' };
    default:
      return { text: 'text-gray-400', bg: 'bg-gray-500/20' };
  }
};

interface FeedCardProps {
  feed: AtomFeed;
  onTest: (feedId: number) => Promise<FeedTestResult>;
  onDelete: (feedId: number) => Promise<void>;
  onUpdate: (feedId: number, updates: { name?: string; feedType?: FeedType }) => Promise<void>;
}

function FeedCard({ feed, onTest, onDelete, onUpdate }: FeedCardProps) {
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState(feed.name);
  const [editType, setEditType] = useState<FeedType>(feed.feedType);
  const [testResult, setTestResult] = useState<FeedTestResult | null>(null);

  const TypeIcon = getFeedTypeIcon(editing ? editType : feed.feedType);
  const { text: typeColor, bg: typeBgColor } = getFeedTypeColor(editing ? editType : feed.feedType);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(feed.id);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the feed "${feed.name}"?`)) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(feed.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleStartEdit = () => {
    setEditName(feed.name);
    setEditType(feed.feedType);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(feed.name);
    setEditType(feed.feedType);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await onUpdate(feed.id, { name: editName, feedType: editType });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-board-bg border border-board-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${typeBgColor}`}>
            <TypeIcon size={20} className={typeColor} />
          </div>
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="px-2 py-1 text-sm bg-board-panel border border-board-border rounded text-white w-full focus:outline-none focus:border-blue-500"
                placeholder="Feed name"
              />
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as FeedType)}
                className="px-2 py-1 text-xs bg-board-panel border border-board-border rounded text-white w-full focus:outline-none focus:border-blue-500"
              >
                <option value="PROJECTS">Projects</option>
                <option value="OPPORTUNITIES">Opportunities</option>
                <option value="SERVICE_TICKETS">Service Tickets</option>
              </select>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-white">{feed.name}</h3>
              <span className={`text-xs ${typeColor}`}>{feed.feedType.replace('_', ' ')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50"
                title="Save changes"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-board-border rounded transition-colors"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartEdit}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-board-border rounded transition-colors"
                title="Edit feed"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={handleTest}
                disabled={testing}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-board-border rounded transition-colors disabled:opacity-50"
                title="Test feed connection"
              >
                {testing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <PlayCircle size={16} />
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                title="Delete feed"
              >
                {deleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Feed URL */}
      <div className="mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
          <ExternalLink size={12} />
          <span>Feed URL</span>
        </div>
        <p className="text-xs text-gray-300 font-mono bg-board-panel/50 px-2 py-1 rounded truncate" title={feed.feedUrl}>
          {feed.feedUrl}
        </p>
      </div>

      {/* Last Sync */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock size={12} />
        <span>Last sync: {formatDate(feed.lastSync)}</span>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`mt-3 px-2 py-1.5 rounded text-xs flex items-center gap-2 ${
          testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {testResult.success ? (
            <>
              <CheckCircle size={14} />
              <span>Connection successful</span>
            </>
          ) : (
            <>
              <XCircle size={14} />
              <span>{testResult.error || 'Connection failed'}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AtomFeedManager() {
  const { showToast } = useToast();
  const [feeds, setFeeds] = useState<AtomFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inElectron = isElectron();

  const fetchFeeds = useCallback(async () => {
    try {
      let data: AtomFeed[];
      if (inElectron) {
        data = await electronFeedsApi.getAll();
      } else {
        data = await feedsApi.getAll();
      }
      setFeeds(data);
    } catch (err) {
      console.error('Failed to fetch feeds:', err);
      showToast('error', 'Failed to load feeds');
    } finally {
      setLoading(false);
    }
  }, [showToast, inElectron]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const handleImportClick = () => {
    if (inElectron) {
      handleElectronImport();
    } else {
      // Trigger file input for web
      fileInputRef.current?.click();
    }
  };

  const handleElectronImport = async () => {
    setImporting(true);
    try {
      const imported = await electronFeedsApi.importFromDialog();
      if (imported.length > 0) {
        showToast('success', `Imported ${imported.length} feed(s)`);
        fetchFeeds();
      }
    } catch (err) {
      console.error('Failed to import feeds:', err);
      const message = err instanceof Error ? err.message : 'Failed to import feeds';
      showToast('error', message);
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await feedsApi.upload(file, true);
      showToast('success', `Imported ${result.feeds.length} feed(s)`);
      if (result.syncsTriggered.length > 0) {
        showToast('info', `Triggered ${result.syncsTriggered.length} sync(s)`);
      }
      fetchFeeds();
    } catch (err) {
      console.error('Failed to import feed:', err);
      const message = err instanceof Error ? err.message : 'Failed to import feed';
      showToast('error', message);
    } finally {
      setImporting(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTest = async (feedId: number): Promise<FeedTestResult> => {
    try {
      if (inElectron) {
        return await electronFeedsApi.test(feedId);
      } else {
        const result = await feedsApi.test(feedId);
        return { success: result.status === 'ok', error: result.message };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Test failed' };
    }
  };

  const handleDelete = async (feedId: number) => {
    try {
      if (inElectron) {
        await electronFeedsApi.delete(feedId);
      } else {
        await feedsApi.delete(feedId);
      }
      showToast('success', 'Feed deleted');
      fetchFeeds();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete feed';
      showToast('error', message);
    }
  };

  const handleUpdate = async (feedId: number, updates: { name?: string; feedType?: FeedType }) => {
    try {
      if (inElectron) {
        await electronFeedsApi.update(feedId, updates);
      } else {
        // Web mode would need a different API - for now just refetch
        console.warn('Feed update not supported in web mode');
      }
      showToast('success', 'Feed updated');
      fetchFeeds();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update feed';
      showToast('error', message);
      throw err; // Re-throw so the card knows the save failed
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (inElectron) {
      // In Electron, we can't directly access file paths from drag-drop
      showToast('info', 'Please use the Import button to select ATOMSVC files');
      return;
    }

    // For web, handle the dropped file
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.atomsvc') && !file.name.endsWith('.xml')) {
      showToast('error', 'Please drop an .atomsvc or .xml file');
      return;
    }

    setImporting(true);
    try {
      const result = await feedsApi.upload(file, true);
      showToast('success', `Imported ${result.feeds.length} feed(s)`);
      if (result.syncsTriggered.length > 0) {
        showToast('info', `Triggered ${result.syncsTriggered.length} sync(s)`);
      }
      fetchFeeds();
    } catch (err) {
      console.error('Failed to import feed:', err);
      const message = err instanceof Error ? err.message : 'Failed to import feed';
      showToast('error', message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      {/* Hidden file input for web */}
      {!inElectron && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".atomsvc,.xml"
          onChange={handleFileSelect}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-white">ATOM Feeds</h2>
          <p className="text-xs text-gray-400">
            Import ATOMSVC files from your SSRS subscriptions to configure data sources.
          </p>
        </div>
        <button
          onClick={handleImportClick}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {importing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <FileUp size={16} />
              Import ATOMSVC
            </>
          )}
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mb-4 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-board-border bg-board-panel/50'
        }`}
      >
        <FileUp size={32} className={`mx-auto mb-2 ${dragOver ? 'text-blue-400' : 'text-gray-500'}`} />
        <p className={`text-sm ${dragOver ? 'text-blue-400' : 'text-gray-400'}`}>
          Drop ATOMSVC files here or use the Import button above
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Supports .atomsvc and .xml files exported from SSRS
        </p>
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-gray-400 animate-spin" />
        </div>
      ) : feeds.length === 0 ? (
        <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
          <FolderKanban size={32} className="text-gray-500 mx-auto mb-3" />
          <h3 className="text-white font-medium mb-2">No Feeds Configured</h3>
          <p className="text-gray-400 text-sm mb-4">
            Import an ATOMSVC file from your SSRS report subscriptions to get started.
          </p>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <FileUp size={16} />
            Import Your First Feed
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              onTest={handleTest}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
