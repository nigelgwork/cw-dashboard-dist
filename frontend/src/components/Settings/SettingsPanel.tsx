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
  Database,
  Trash2,
  FileText,
} from 'lucide-react';
import AtomFeedManager from './AtomFeedManager';
import { isElectron, electronUpdatesApi, electronSettingsApi, electronProjectsApi, electronOpportunitiesApi, electronServiceTicketsApi } from '../../api/electron-api';
import { useToast } from '../../context/ToastContext';

type SettingsTab = 'feeds' | 'sync' | 'detail-fields' | 'data' | 'updates' | 'about';

// Setting key for visible detail fields
const PROJECT_DETAIL_VISIBLE_FIELDS_KEY = 'project_detail_visible_fields';

// Strip HTML tags and convert to readable text
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

  // Data clearing state
  const [clearingProjects, setClearingProjects] = useState(false);
  const [clearingOpportunities, setClearingOpportunities] = useState(false);
  const [clearingServiceTickets, setClearingServiceTickets] = useState(false);

  // Detail fields state
  const [availableDetailFields, setAvailableDetailFields] = useState<string[]>([]);
  const [selectedDetailFields, setSelectedDetailFields] = useState<string[]>([]);
  const [loadingDetailFields, setLoadingDetailFields] = useState(false);
  const [savingDetailFields, setSavingDetailFields] = useState(false);

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
  }, []);

  // Load detail fields when tab is selected
  useEffect(() => {
    if (!isElectron() || activeTab !== 'detail-fields') return;

    const loadDetailFields = async () => {
      setLoadingDetailFields(true);
      try {
        // Load available fields from projects
        const fields = await electronProjectsApi.getAvailableDetailFields();
        setAvailableDetailFields(fields);

        // Load currently selected fields from settings
        const savedFields = await electronSettingsApi.get(PROJECT_DETAIL_VISIBLE_FIELDS_KEY);
        if (savedFields) {
          try {
            setSelectedDetailFields(JSON.parse(savedFields));
          } catch {
            setSelectedDetailFields([]);
          }
        }
      } catch (err) {
        console.error('Failed to load detail fields:', err);
      } finally {
        setLoadingDetailFields(false);
      }
    };
    loadDetailFields();
  }, [activeTab]);

  const handleSaveDetailFields = async () => {
    if (!isElectron()) return;
    setSavingDetailFields(true);
    try {
      await electronSettingsApi.set(PROJECT_DETAIL_VISIBLE_FIELDS_KEY, JSON.stringify(selectedDetailFields));
      showToast('success', 'Detail fields saved');
    } catch (err) {
      showToast('error', 'Failed to save detail fields');
    } finally {
      setSavingDetailFields(false);
    }
  };

  const toggleDetailField = (field: string) => {
    setSelectedDetailFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

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

  const handleClearProjects = async () => {
    if (!isElectron()) return;
    if (!confirm('Are you sure you want to clear all projects? This cannot be undone.')) return;
    setClearingProjects(true);
    try {
      const result = await electronProjectsApi.clearAll();
      showToast('success', `Cleared ${result.deleted} projects`);
    } catch (err) {
      showToast('error', 'Failed to clear projects');
    } finally {
      setClearingProjects(false);
    }
  };

  const handleClearOpportunities = async () => {
    if (!isElectron()) return;
    if (!confirm('Are you sure you want to clear all opportunities? This cannot be undone.')) return;
    setClearingOpportunities(true);
    try {
      const result = await electronOpportunitiesApi.clearAll();
      showToast('success', `Cleared ${result.deleted} opportunities`);
    } catch (err) {
      showToast('error', 'Failed to clear opportunities');
    } finally {
      setClearingOpportunities(false);
    }
  };

  const handleClearServiceTickets = async () => {
    if (!isElectron()) return;
    if (!confirm('Are you sure you want to clear all service tickets? This cannot be undone.')) return;
    setClearingServiceTickets(true);
    try {
      const result = await electronServiceTicketsApi.clearAll();
      showToast('success', `Cleared ${result.deleted} service tickets`);
    } catch (err) {
      showToast('error', 'Failed to clear service tickets');
    } finally {
      setClearingServiceTickets(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'feeds', label: 'Data Feeds', icon: <Rss size={16} /> },
    { id: 'sync', label: 'Sync Settings', icon: <RefreshCw size={16} /> },
    { id: 'detail-fields', label: 'Detail Fields', icon: <FileText size={16} /> },
    { id: 'data', label: 'Data Management', icon: <Database size={16} /> },
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

          {activeTab === 'detail-fields' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Project Detail Fields</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Select which fields from the detail feed to display on project cards. These fields will appear in the "Extended Details" section when a card is expanded.
                </p>

                {!isElectron() ? (
                  <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
                    <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">Desktop Only Feature</h3>
                    <p className="text-gray-400 text-sm">
                      Detail field configuration is only available in the desktop application.
                    </p>
                  </div>
                ) : loadingDetailFields ? (
                  <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
                    <Loader2 size={32} className="text-blue-400 mx-auto mb-3 animate-spin" />
                    <p className="text-gray-400 text-sm">Loading available fields...</p>
                  </div>
                ) : availableDetailFields.length === 0 ? (
                  <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
                    <FileText size={32} className="text-gray-500 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">No Detail Data Available</h3>
                    <p className="text-gray-400 text-sm">
                      To use this feature, you need to:
                    </p>
                    <ol className="text-gray-400 text-sm text-left max-w-sm mx-auto mt-3 space-y-1">
                      <li>1. Import a PROJECT_DETAIL feed</li>
                      <li>2. Link it to your PROJECTS feed in Data Feeds</li>
                      <li>3. Run a sync to populate the detail data</li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-board-panel border border-board-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-300">
                          {selectedDetailFields.length} of {availableDetailFields.length} fields selected
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDetailFields([])}
                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-board-border rounded transition-colors"
                          >
                            Clear All
                          </button>
                          <button
                            onClick={() => setSelectedDetailFields([...availableDetailFields])}
                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-board-border rounded transition-colors"
                          >
                            Select All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                        {availableDetailFields.map(field => (
                          <label
                            key={field}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                              selectedDetailFields.includes(field)
                                ? 'bg-purple-500/20 border border-purple-500/30'
                                : 'bg-board-bg border border-board-border hover:border-gray-600'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDetailFields.includes(field)}
                              onChange={() => toggleDetailField(field)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                            />
                            <span className="text-sm text-gray-300 truncate" title={field}>
                              {field}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Save Button */}
                    <div>
                      <button
                        onClick={handleSaveDetailFields}
                        disabled={savingDetailFields}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {savingDetailFields ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            Save Selection
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-white mb-4">Data Management</h2>

                {!isElectron() ? (
                  <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
                    <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3" />
                    <h3 className="text-white font-medium mb-2">Desktop Only Feature</h3>
                    <p className="text-gray-400 text-sm">
                      Data management is only available in the desktop application.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-400 mb-1">Reset Synced Data</h4>
                        <p className="text-xs text-gray-400">
                          Use these options to clear synced data if you need to re-sync from scratch.
                          This is useful if data becomes corrupted or out of sync with the source.
                        </p>
                      </div>
                    </div>

                    <div className="bg-board-panel border border-board-border rounded-lg divide-y divide-board-border">
                      {/* Projects */}
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-white">Projects</h4>
                          <p className="text-xs text-gray-500">Clear all synced project data</p>
                        </div>
                        <button
                          onClick={handleClearProjects}
                          disabled={clearingProjects}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {clearingProjects ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Clear Projects
                        </button>
                      </div>

                      {/* Opportunities */}
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-white">Opportunities</h4>
                          <p className="text-xs text-gray-500">Clear all synced opportunity data</p>
                        </div>
                        <button
                          onClick={handleClearOpportunities}
                          disabled={clearingOpportunities}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {clearingOpportunities ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Clear Opportunities
                        </button>
                      </div>

                      {/* Service Tickets */}
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-white">Service Tickets</h4>
                          <p className="text-xs text-gray-500">Clear all synced service ticket data</p>
                        </div>
                        <button
                          onClick={handleClearServiceTickets}
                          disabled={clearingServiceTickets}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {clearingServiceTickets ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Clear Service Tickets
                        </button>
                      </div>
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
                              <p className="text-xs text-gray-400 whitespace-pre-line">{stripHtml(updateState.releaseNotes)}</p>
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
