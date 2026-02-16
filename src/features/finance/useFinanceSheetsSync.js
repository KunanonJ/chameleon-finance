import { useState, useCallback } from 'react';
import * as SheetsAPI from '@features/sync/sheetsApi';
import { useFinanceStore } from '@store/financeStore';
import { FINANCE_SHEET_TAB } from '@shared/lib/financeConstants';

const SYNC_STATE_KEY = '_finance_sync_state';

function loadSyncState() {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSyncState(state) {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

export function useFinanceSheetsSync() {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncTime, setLastSyncTime] = useState(() => loadSyncState().lastSyncTime || null);
  const [lastError, setLastError] = useState(null);

  const setRecords = useFinanceStore((s) => s.setRecords);

  const pullFinance = useCallback(async () => {
    const creds = SheetsAPI.getCredentials();
    if (!creds) {
      setLastError('Not connected to Google Sheets');
      return { success: false };
    }

    setSyncStatus('syncing');
    setLastError(null);

    try {
      const gidMatch = (creds.sheetsUrl || '').match(/(?:[?#&]gid=)(\d+)/i);
      const targetTab = gidMatch ? `gid:${gidMatch[1]}` : FINANCE_SHEET_TAB;
      const records = await SheetsAPI.readAllFinancialRecords(creds.spreadsheetId, targetTab);
      setRecords(records);

      const now = new Date().toISOString();
      setLastSyncTime(now);
      saveSyncState({ lastSyncTime: now });
      setSyncStatus('idle');

      return { success: true, count: records.length };
    } catch (err) {
      const msg = err.message || 'Sync failed';
      setLastError(msg);
      setSyncStatus('error');
      return { success: false, error: msg };
    }
  }, [setRecords]);

  return {
    syncStatus,
    lastSyncTime,
    lastError,
    pullFinance,
  };
}
