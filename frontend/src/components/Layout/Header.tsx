import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, LayoutDashboard, FolderKanban, TrendingUp, Ticket, Pin, AlertCircle, Database, Settings, Download, ArrowDownToLine, FileText, Users } from 'lucide-react';
import { isElectron, events, updates } from '../../api';

interface UpdateState {
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  version: string | null;
  error: string | null;
}

const CURRENT_VERSION = __APP_VERSION__;

export type ViewType = 'dashboard' | 'projects' | 'opportunities' | 'service-tickets' | 'quotes' | 'resources' | 'sync' | 'settings';

interface HeaderProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  pinnedCount?: number;
}

const tabs: { id: ViewType; label: string; icon: React.ReactNode; iconOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Pin size={16} /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban size={16} /> },
  { id: 'opportunities', label: 'Opportunities', icon: <TrendingUp size={16} /> },
  { id: 'service-tickets', label: 'Tickets', icon: <Ticket size={16} /> },
  { id: 'quotes', label: 'Quotes', icon: <FileText size={16} /> },
  { id: 'resources', label: 'Resources', icon: <Users size={16} /> },
  { id: 'sync', label: 'Sync', icon: <Database size={16} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} />, iconOnly: true },
];

export default function Header({ activeView, onViewChange, pinnedCount = 0 }: HeaderProps) {
  const isElectronApp = isElectron();
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>({
    available: false,
    downloading: false,
    downloaded: false,
    progress: 0,
    version: null,
    error: null,
  });

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

  useEffect(() => {
    // Check version on mount and periodically
    checkVersion();
    const versionInterval = isElectronApp ? null : setInterval(checkVersion, 30000);

    return () => {
      if (versionInterval) clearInterval(versionInterval);
    };
  }, [checkVersion, isElectronApp]);

  // Listen for Electron update events
  useEffect(() => {
    if (!isElectronApp || !events) return;

    // Background update check found an update
    const unsubBackgroundAvailable = events.on('update:available-background', (data: unknown) => {
      const updateData = data as { version: string; releaseNotes?: string };
      setUpdateState(prev => ({
        ...prev,
        available: true,
        version: updateData.version,
      }));
    });

    // User-initiated update check found an update
    const unsubAvailable = events.on('update:available', (data: unknown) => {
      const updateData = data as { version: string; releaseNotes?: string };
      setUpdateState(prev => ({
        ...prev,
        available: true,
        version: updateData.version,
      }));
    });

    // Download progress
    const unsubProgress = events.on('update:progress', (data: unknown) => {
      const progressData = data as { percent: number };
      setUpdateState(prev => ({
        ...prev,
        downloading: true,
        progress: progressData.percent,
      }));
    });

    // Download complete
    const unsubDownloaded = events.on('update:downloaded', (data: unknown) => {
      const downloadData = data as { version: string };
      setUpdateState(prev => ({
        ...prev,
        downloading: false,
        downloaded: true,
        progress: 100,
        version: downloadData.version,
      }));
    });

    // Update error
    const unsubError = events.on('update:error', (data: unknown) => {
      const errorData = data as { error: string };
      setUpdateState(prev => ({
        ...prev,
        downloading: false,
        error: errorData.error,
      }));
    });

    return () => {
      unsubBackgroundAvailable();
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, [isElectronApp]);

  const handleRefresh = () => {
    window.location.reload();
  };

  // Handle download update
  const handleDownloadUpdate = async () => {
    if (!updates) return;
    try {
      setUpdateState(prev => ({ ...prev, downloading: true, progress: 0 }));
      await updates.download();
    } catch (error) {
      setUpdateState(prev => ({
        ...prev,
        downloading: false,
        error: error instanceof Error ? error.message : 'Download failed',
      }));
    }
  };

  // Handle install update
  const handleInstallUpdate = async () => {
    if (!updates) return;
    try {
      await updates.install();
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  // Render update button for Electron
  const renderUpdateButton = () => {
    if (!isElectronApp) return null;

    // Download complete - show install button
    if (updateState.downloaded) {
      return (
        <button
          onClick={handleInstallUpdate}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
          title={`Install v${updateState.version} and restart`}
        >
          <ArrowDownToLine size={16} />
          <span className="text-sm font-medium">Install & Restart</span>
        </button>
      );
    }

    // Downloading - show progress bar
    if (updateState.downloading) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-board-border rounded">
          <Download size={16} className="text-blue-400 animate-bounce" />
          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${updateState.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{updateState.progress}%</span>
        </div>
      );
    }

    // Update available - show download button with notification dot
    if (updateState.available) {
      return (
        <button
          onClick={handleDownloadUpdate}
          className="relative flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
          title={`Download v${updateState.version}`}
        >
          <Download size={16} />
          <span className="text-sm font-medium">Update v{updateState.version}</span>
          {/* Notification dot */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </button>
      );
    }

    return null;
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
              className={`flex items-center gap-2 ${tab.iconOnly ? 'px-2' : 'px-3'} py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeView === tab.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-board-border/50'
              }`}
              title={tab.label}
            >
              {tab.icon}
              {!tab.iconOnly && <span>{tab.label}</span>}
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
        {/* Desktop mode indicator - only show in Electron when no update UI */}
        {isElectronApp && !updateState.available && !updateState.downloading && !updateState.downloaded && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-board-border px-2 py-1 rounded">Desktop</span>
          </div>
        )}

        {/* Electron update button */}
        {renderUpdateButton()}

        {/* Web mode: Refresh button / Update notification */}
        {!isElectronApp && (
          newVersionAvailable ? (
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
          )
        )}

        {/* Version */}
        <span className="text-xs text-gray-500">v{CURRENT_VERSION}</span>
      </div>
    </header>
  );
}
