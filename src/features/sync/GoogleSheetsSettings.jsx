import { useState } from 'react';
import { useSheetsSync } from '@features/sync/useSheetsSync';
import { useAutoSyncStore } from '@store/autoSyncStore';

const INTERVAL_OPTIONS = [
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
  { label: '15 min', value: 900000 },
];

export default function GoogleSheetsSettings() {
  const { syncStatus, lastSyncTime, lastError, isConnected, connect, disconnect, pull } = useSheetsSync();
  const autoSyncEnabled = useAutoSyncStore((s) => s.autoSyncEnabled);
  const autoSyncInterval = useAutoSyncStore((s) => s.autoSyncInterval);
  const setAutoSyncEnabled = useAutoSyncStore((s) => s.setAutoSyncEnabled);
  const setAutoSyncInterval = useAutoSyncStore((s) => s.setAutoSyncInterval);
  const [sheetUrl, setSheetUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const connected = isConnected();

  const handleConnect = async () => {
    if (!sheetUrl.trim()) {
      setError('Please enter a Google Sheets URL');
      return;
    }

    setConnecting(true);
    setError('');

    try {
      const result = await connect(sheetUrl.trim());
      if (!result.success) {
        setError(result.error || 'Failed to connect');
      }
    } catch (err) {
      setError(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    await pull();
  };

  const formatSyncTime = (isoString) => {
    if (!isoString) return 'Never';
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Google Sheets Sync</label>

      {connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 dark:bg-green-900/30">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">Connected</span>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500">
            Last sync: {formatSyncTime(lastSyncTime)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Auto-sync runs every 5 minutes and when you come back online.
          </div>

          {lastError && (
            <p className="text-xs text-red-500">{lastError}</p>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing'}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={disconnect}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-red-400"
            >
              Disconnect
            </button>
          </div>

          {/* Auto-sync Settings */}
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Auto-sync</span>
              <button
                onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            {autoSyncEnabled && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">Every</span>
                <select
                  value={autoSyncInterval}
                  onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Connect a published Google Sheets CSV URL to sync your subscriptions.
          </p>

          <input
            type="text"
            value={sheetUrl}
            onChange={(e) => {
              setSheetUrl(e.target.value);
              setError('');
            }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          />

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      )}
    </div>
  );
}
