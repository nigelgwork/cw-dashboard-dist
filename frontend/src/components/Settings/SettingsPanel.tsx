import { useState, useEffect } from 'react';
import {
  Settings,
  Rss,
  RefreshCw,
  Download,
  CheckCircle,
  Loader2,
  AlertCircle,
  Info,
  Key,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import AtomFeedManager from './AtomFeedManager';
import { isElectron, electronUpdatesApi, electronSettingsApi } from '../../api/electron-api';
import { useToast } from '../../context/ToastContext';

type SettingsTab = 'feeds' | 'sync' | 'updates' | 'about';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  version: string | null;
  releaseNotes: string | null;
  error: string | null;
}

export default function SettingsPanel() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('feeds');
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateState, setUpdateState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    version: null,
    releaseNotes: null,
    error: null,
  });

  // Sync settings
  const [syncInterval, setSyncInterval] = useState<string>('60');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // GitHub token settings
  const [hasGitHubToken, setHasGitHubToken] = useState(false);
  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;

    // Get app version
    electronUpdatesApi.getVersion().then(setAppVersion).catch(() => setAppVersion('Unknown'));

    // Load settings
    const loadSettings = async () => {
      try {
        const interval = await electronSettingsApi.get('sync_interval_minutes');
        const auto = await electronSettingsApi.get('auto_sync_enabled');
        if (interval) setSyncInterval(interval);
        if (auto !== null) setAutoSync(auto === 'true');
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();

    // Load GitHub token status
    const loadTokenStatus = async () => {
      try {
        const status = await electronUpdatesApi.getGitHubTokenStatus();
        setHasGitHubToken(status.hasToken);
        setMaskedToken(status.maskedToken);
      } catch (err) {
        console.error('Failed to load GitHub token status:', err);
      }
    };
    loadTokenStatus();
  }, []);

  const handleCheckUpdate = async () => {
    if (!isElectron()) return;
    setUpdateState((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const result = await electronUpdatesApi.check();
      setUpdateState((prev) => ({
        ...prev,
        checking: false,
        available: result.updateAvailable,
        version: result.version || null,
        releaseNotes: result.releaseNotes || null,
      }));
      if (!result.updateAvailable) {
        showToast('info', 'You are running the latest version');
      }
    } catch (err) {
      setUpdateState((prev) => ({
        ...prev,
        checking: false,
        error: err instanceof Error ? err.message : 'Failed to check for updates',
      }));
    }
  };

  const handleDownloadUpdate = async () => {
    if (!isElectron()) return;
    setUpdateState((prev) => ({ ...prev, downloading: true, error: null }));
    try {
      await electronUpdatesApi.download();
      setUpdateState((prev) => ({ ...prev, downloading: false, downloaded: true }));
      showToast('success', 'Update downloaded. Restart to install.');
    } catch (err) {
      setUpdateState((prev) => ({
        ...prev,
        downloading: false,
        error: err instanceof Error ? err.message : 'Failed to download update',
      }));
    }
  };

  const handleInstallUpdate = async () => {
    if (!isElectron()) return;
    try {
      await electronUpdatesApi.install();
    } catch (err) {
      showToast('error', 'Failed to install update');
    }
  };

  const handleSaveSettings = async () => {
    if (!isElectron()) return;
    setSavingSettings(true);
    try {
      await electronSettingsApi.set('sync_interval_minutes', syncInterval);
      await electronSettingsApi.set('auto_sync_enabled', autoSync.toString());
      showToast('success', 'Settings saved');
    } catch (err) {
      showToast('error', 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveToken = async () => {
    if (!isElectron() || !newToken.trim()) return;
    setSavingToken(true);
    try {
      await electronUpdatesApi.setGitHubToken(newToken.trim());
      const status = await electronUpdatesApi.getGitHubTokenStatus();
      setHasGitHubToken(status.hasToken);
      setMaskedToken(status.maskedToken);
      setNewToken('');
      setShowToken(false);
      showToast('success', 'GitHub token saved. You can now check for updates.');
    } catch (err) {
      showToast('error', 'Failed to save GitHub token');
    } finally {
      setSavingToken(false);
    }
  };

  const handleClearToken = async () => {
    if (!isElectron()) return;
    try {
      await electronUpdatesApi.setGitHubToken(null);
      setHasGitHubToken(false);
      setMaskedToken(null);
      showToast('info', 'GitHub token cleared');
    } catch (err) {
      showToast('error', 'Failed to clear GitHub token');
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'feeds', label: 'Data Feeds', icon: <Rss size={16} /> },
    { id: 'sync', label: 'Sync Settings', icon: <RefreshCw size={16} /> },
    { id: 'updates', label: 'Updates', icon: <Download size={16} /> },
    { id: 'about', label: 'About', icon: <Info size={16} /> },
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-gray-400" size={24} />
        <h2 className="text-xl font-bold text-white">Settings</h2>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-board-border/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'feeds' && <AtomFeedManager />}

          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Sync Settings</h2>

                {!isElectron() ? (
                  <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
                    <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">Desktop Only Feature</h3>
                    <p className="text-gray-400 text-sm">
                      Sync settings are only available in the desktop application.
                    </p>
                  </div>
                ) : (
                  <div className="bg-board-panel border border-board-border rounded-lg p-4 space-y-4">
                    {/* Sync Interval */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Sync Interval (minutes)
                      </label>
                      <select
                        value={syncInterval}
                        onChange={(e) => setSyncInterval(e.target.value)}
                        className="w-full bg-board-bg border border-board-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="15">Every 15 minutes</option>
                        <option value="30">Every 30 minutes</option>
                        <option value="60">Every hour</option>
                        <option value="120">Every 2 hours</option>
                        <option value="240">Every 4 hours</option>
                      </select>
                    </div>

                    {/* Auto Sync Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-300">
                          Automatic Sync
                        </label>
                        <p className="text-xs text-gray-500">
                          Automatically sync data at the configured interval
                        </p>
                      </div>
                      <button
                        onClick={() => setAutoSync(!autoSync)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          autoSync ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            autoSync ? 'left-6' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {savingSettings ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            Save Settings
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Updates</h2>

                {!isElectron() ? (
                  <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
                    <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">Desktop Only Feature</h3>
                    <p className="text-gray-400 text-sm">
                      Auto-updates are only available in the desktop application.
                    </p>
                  </div>
                ) : (
                  <div className="bg-board-panel border border-board-border rounded-lg p-4 space-y-4">
                    {/* Current Version */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-400">Current Version</span>
                        <p className="text-lg font-mono text-white">v{appVersion}</p>
                      </div>
                      <button
                        onClick={handleCheckUpdate}
                        disabled={updateState.checking}
                        className="flex items-center gap-2 px-4 py-2 bg-board-bg hover:bg-board-border text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {updateState.checking ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            Check for Updates
                          </>
                        )}
                      </button>
                    </div>

                    {/* Update Available */}
                    {updateState.available && !updateState.downloaded && (
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-blue-400 mb-1">
                              Update Available: v{updateState.version}
                            </h4>
                            {updateState.releaseNotes && (
                              <p className="text-xs text-gray-400">{updateState.releaseNotes}</p>
                            )}
                          </div>
                          <button
                            onClick={handleDownloadUpdate}
                            disabled={updateState.downloading}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
                          >
                            {updateState.downloading ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download size={14} />
                                Download
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Update Downloaded */}
                    {updateState.downloaded && (
                      <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={20} className="text-green-400" />
                            <div>
                              <h4 className="text-sm font-medium text-green-400">
                                Update Ready to Install
                              </h4>
                              <p className="text-xs text-gray-400">
                                Restart the application to install v{updateState.version}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleInstallUpdate}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
                          >
                            <RefreshCw size={14} />
                            Restart & Install
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {updateState.error && (
                      <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-400">{updateState.error}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* GitHub Token Section */}
                {isElectron() && (
                  <div className="mt-6">
                    <h3 className="text-md font-medium text-white mb-3 flex items-center gap-2">
                      <Key size={18} className="text-gray-400" />
                      GitHub Access Token
                    </h3>
                    <div className="bg-board-panel border border-board-border rounded-lg p-4 space-y-4">
                      <p className="text-xs text-gray-400">
                        This application updates from a private GitHub repository.
                        A personal access token (PAT) with <code className="bg-board-bg px-1 rounded">repo</code> scope is required to check for and download updates.
                      </p>

                      {/* Current token status */}
                      {hasGitHubToken ? (
                        <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={16} className="text-green-400" />
                            <div>
                              <span className="text-sm text-green-400">Token configured</span>
                              <p className="text-xs text-gray-500 font-mono">{maskedToken}</p>
                            </div>
                          </div>
                          <button
                            onClick={handleClearToken}
                            className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-xs transition-colors"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                          <AlertCircle size={16} className="text-yellow-400" />
                          <span className="text-sm text-yellow-400">No token configured - updates will not work</span>
                        </div>
                      )}

                      {/* Token input */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">
                          {hasGitHubToken ? 'Update Token' : 'Enter Token'}
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showToken ? 'text' : 'password'}
                              value={newToken}
                              onChange={(e) => setNewToken(e.target.value)}
                              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                              className="w-full bg-board-bg border border-board-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <button
                            onClick={handleSaveToken}
                            disabled={savingToken || !newToken.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {savingToken ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle size={14} />
                            )}
                            Save
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Create a token at{' '}
                          <span className="text-blue-400">GitHub → Settings → Developer settings → Personal access tokens</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-white mb-4">About CW Dashboard</h2>

                <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-xl mb-4">
                    <Settings size={32} className="text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">CW Dashboard</h3>
                  <p className="text-gray-400 mb-4">
                    {isElectron() ? `Version ${appVersion}` : 'Web Version'}
                  </p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    A dashboard for tracking ConnectWise projects and opportunities.
                    Syncs data from SSRS ATOM feeds and displays project budgets,
                    opportunity pipelines, and sync history.
                  </p>
                </div>

                <div className="mt-4 bg-board-panel border border-board-border rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">System Information</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Platform</span>
                      <span className="text-gray-300">
                        {isElectron() ? 'Desktop (Electron)' : 'Web Browser'}
                      </span>
                    </div>
                    {isElectron() && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Version</span>
                        <span className="text-gray-300">{appVersion}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Database</span>
                      <span className="text-gray-300">
                        {isElectron() ? 'SQLite (Local)' : 'PostgreSQL (Remote)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
