import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LayoutDashboard, FolderKanban, TrendingUp, Ticket, Pin, AlertCircle, Clock, Database, Settings } from 'lucide-react';
import { sync, isElectron } from '../../api';

interface SyncStatus {
  last_sync: string | null;
  project_count: number;
  opportunity_count: number;
  service_ticket_count?: number;
}

const CURRENT_VERSION = __APP_VERSION__;

export type ViewType = 'dashboard' | 'projects' | 'opportunities' | 'service-tickets' | 'sync' | 'settings';

interface HeaderProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  pinnedCount?: number;
}

const tabs: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Pin size={16} /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={16} /> },
  { id: 'opportunities', label: 'Opportunities', icon: <TrendingUp size={16} /> },
  { id: 'service-tickets', label: 'Tickets', icon: <Ticket size={16} /> },
  { id: 'sync', label: 'Data Sync', icon: <Database size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
];

const formatLastSync = (dateStr: string | null): string => {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
};

export default function Header({ activeView, onViewChange, pinnedCount = 0 }: HeaderProps) {
  const isElectronApp = isElectron();
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Check for new version periodically (web mode only - Electron has its own updater)
  const checkVersion = useCallback(async () => {
    if (isElectronApp) return; // Skip in Electron - uses built-in auto-updater
    try {
      const response = await fetch(`/VERSION?t=${Date.now()}`);
      if (response.ok) {
        const serverVersion = (await response.text()).trim();
        if (serverVersion !== CURRENT_VERSION) {
          setNewVersionAvailable(true);
        }
      }
    } catch {
      // Silently fail version check
    }
  }, [isElectronApp]);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const status = await sync.getStatus();
      // Map the response to our SyncStatus interface
      setSyncStatus({
        last_sync: status.projects?.lastSync || status.opportunities?.lastSync || null,
        project_count: status.projects?.recordsSynced || 0,
        opportunity_count: status.opportunities?.recordsSynced || 0,
        service_ticket_count: status.serviceTickets?.recordsSynced || 0,
      });
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    // Check version and sync status on mount and periodically
    checkVersion();
    fetchSyncStatus();
    const versionInterval = isElectronApp ? null : setInterval(checkVersion, 30000);
    const syncInterval = setInterval(fetchSyncStatus, 60000);
    return () => {
      if (versionInterval) clearInterval(versionInterval);
      clearInterval(syncInterval);
    };
  }, [checkVersion, fetchSyncStatus, isElectronApp]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="h-14 bg-board-panel border-b border-board-border flex items-center justify-between px-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold text-white">CW Dashboard</h1>
        </div>

        {/* Tab navigation */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeView === tab.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-board-border/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'dashboard' && pinnedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500/30 text-blue-300 rounded-full">
                  {pinnedCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Last sync time */}
        {syncStatus && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock size={14} />
            <span className="text-xs">
              Synced: <span className="text-white">{formatLastSync(syncStatus.last_sync)}</span>
            </span>
            <span className="text-xs text-gray-500">
              ({syncStatus.project_count}P / {syncStatus.opportunity_count}O / {syncStatus.service_ticket_count || 0}T)
            </span>
          </div>
        )}

        {/* Desktop mode indicator - only show in Electron */}
        {isElectronApp && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-board-border px-2 py-1 rounded">Desktop</span>
          </div>
        )}

        {/* Refresh button / Update notification */}
        {newVersionAvailable ? (
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors animate-pulse"
            title="New version available - click to refresh"
          >
            <AlertCircle size={16} />
            <span className="text-sm font-medium">Update Available</span>
          </button>
        ) : (
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-white hover:bg-board-border rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        )}

        {/* Version */}
        <span className="text-xs text-gray-500">v{CURRENT_VERSION}</span>
      </div>
    </header>
  );
}
