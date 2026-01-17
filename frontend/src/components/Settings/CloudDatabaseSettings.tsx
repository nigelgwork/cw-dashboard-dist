import { useState, useEffect, useCallback } from 'react';
import { Cloud, CheckCircle, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { isElectron } from '../../api/electron-api';
import { cloud } from '../../api';
import type { CloudStatus } from '../../types';
import { useToast } from '../../context/ToastContext';

export default function CloudDatabaseSettings() {
  const { showToast } = useToast();
  const [connectionString, setConnectionString] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<CloudStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!cloud) return;
    try {
      const currentStatus = await cloud.getStatus();
      setStatus(currentStatus);
    } catch (err) {
      console.error('Failed to load cloud status:', err);
    }
  }, []);

  useEffect(() => {
    if (!isElectron() || !cloud) return;
    loadStatus();
  }, [loadStatus]);

  const handleTestConnection = async () => {
    if (!cloud || !connectionString.trim()) {
      showToast('error', 'Please enter a connection string');
      return;
    }

    setTesting(true);
    try {
      const result = await cloud.testConnection(connectionString);
      if (result.success) {
        showToast('success', result.message || 'Connection successful');
      } else {
        showToast('error', result.message || 'Connection failed');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    if (!cloud || !connectionString.trim()) {
      showToast('error', 'Please enter a connection string');
      return;
    }

    setSaving(true);
    try {
      await cloud.setConnectionString(connectionString);
      setConnecting(true);
      const connected = await cloud.connect();
      if (connected) {
        showToast('success', 'Connected to cloud database');
        setConnectionString(''); // Clear after successful save
        await loadStatus(); // Refresh status
      } else {
        showToast('error', 'Connection failed');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save connection');
    } finally {
      setSaving(false);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!cloud) return;

    try {
      await cloud.disconnect();
      showToast('info', 'Disconnected from cloud database');
      await loadStatus();
    } catch (err) {
      showToast('error', 'Failed to disconnect');
    }
  };

  const handleReconnect = async () => {
    if (!cloud) return;

    setConnecting(true);
    try {
      const connected = await cloud.connect();
      if (connected) {
        showToast('success', 'Reconnected to cloud database');
      } else {
        showToast('error', 'Reconnection failed');
      }
      await loadStatus();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Reconnection failed');
    } finally {
      setConnecting(false);
    }
  };

  if (!isElectron()) {
    return (
      <div className="bg-board-panel border border-board-border rounded-lg p-6 text-center">
        <AlertCircle size={32} className="text-yellow-500 mx-auto mb-3" />
        <h3 className="text-white font-medium mb-2">Desktop Only Feature</h3>
        <p className="text-gray-400 text-sm">
          Cloud database settings are only available in the desktop application.
        </p>
      </div>
    );
  }

  const isConnected = status?.connected === true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-white mb-4">Cloud Database</h2>

        {/* Status Card */}
        <div className="bg-board-panel border border-board-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : status?.enabled ? 'bg-yellow-500' : 'bg-gray-500'
                }`}
              />
              <div>
                <h4 className="text-sm font-medium text-white">
                  {isConnected ? 'Connected' : status?.enabled ? 'Disconnected' : 'Not Configured'}
                </h4>
                <p className="text-xs text-gray-500">
                  {isConnected
                    ? 'Cloud database is active'
                    : status?.enabled
                    ? status?.lastError || 'Connection lost'
                    : 'Configure connection below'}
                </p>
              </div>
            </div>
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Disconnect
              </button>
            ) : status?.enabled ? (
              <button
                onClick={handleReconnect}
                disabled={connecting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Reconnect'
                )}
              </button>
            ) : null}
          </div>
        </div>

        {/* Connection Form */}
        <div className="bg-board-panel border border-board-border rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
            <Cloud size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-1">Neon PostgreSQL</h4>
              <p className="text-xs text-gray-400">
                Use a Neon serverless PostgreSQL database for multi-device collaboration.
                Get a free database at{' '}
                <a
                  href="https://neon.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  neon.tech
                </a>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Connection String
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder="postgresql://user:password@host/database?sslmode=require"
                className="w-full px-3 py-2 pr-10 bg-board-bg border border-board-border rounded-md text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Your connection string is encrypted and stored securely.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing || !connectionString.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-board-bg hover:bg-board-border text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  Test Connection
                </>
              )}
            </button>

            <button
              onClick={handleSaveAndConnect}
              disabled={saving || connecting || !connectionString.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving || connecting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {saving ? 'Saving...' : 'Connecting...'}
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Save & Connect
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info about data sync */}
        <div className="mt-4 bg-board-panel border border-board-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">What syncs to cloud?</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-gray-400">Employees & Teams (shared across devices)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-gray-400">Resource Tasks (whiteboard assignments)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-green-400" />
              <span className="text-gray-400">Quotations (collaborative proposals)</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-board-border">
              <AlertCircle size={14} className="text-gray-500" />
              <span className="text-gray-500">
                Projects, Opportunities, and Tickets remain local (synced from SSRS)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
