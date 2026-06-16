import { useState, useCallback } from 'react';
import * as SheetsAPI from '@features/sync/sheetsApi';
import { useFinanceStore } from '@store/financeStore';
import { FINANCE_MONTH_TABS, FINANCE_SHEET_TAB } from '@shared/lib/financeConstants';

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
  const [syncProgress, setSyncProgress] = useState(null);
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
    setSyncProgress(null);
    setLastError(null);

    try {
      const gidMatch = (creds.sheetsUrl || '').match(/(?:[?#&]gid=)(\d+)/i);
      let records;
      if (gidMatch) {
        const targetTab = `gid:${gidMatch[1]}`;
        setSyncProgress({ current: 1, total: 1, tab: targetTab });
        records = await SheetsAPI.readAllFinancialRecords(creds.spreadsheetId, targetTab);
      } else {
        records = await SheetsAPI.readAllMonthlyRecords(
          creds.spreadsheetId,
          FINANCE_MONTH_TABS,
          (progress) => setSyncProgress(progress)
        );

        if (records.length === 0) {
          setSyncProgress({ current: 1, total: 1, tab: FINANCE_SHEET_TAB });
          records = await SheetsAPI.readAllFinancialRecords(creds.spreadsheetId, FINANCE_SHEET_TAB);
        }
      }
      setRecords(records);

      const now = new Date().toISOString();
      setLastSyncTime(now);
      saveSyncState({ lastSyncTime: now });
      setSyncStatus('idle');
      setSyncProgress(null);

      return { success: true, count: records.length };
    } catch (err) {
      const msg = err.message || 'Sync failed';
      setLastError(msg);
      setSyncStatus('error');
      setSyncProgress(null);
      return { success: false, error: msg };
    }
  }, [setRecords]);

  return {
    syncStatus,
    syncProgress,
    lastSyncTime,
    lastError,
    pullFinance,
  };
}
