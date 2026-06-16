import { useEffect, useRef, useState, useCallback } from 'react';
import { useAutoSyncStore } from '@store/autoSyncStore';
import { useFinanceStore } from '@store/financeStore';
import { useSubscriptionStore } from '@store/subscriptionStore';
import * as SheetsAPI from '@features/sync/sheetsApi';
import * as SyncManager from '@features/sync/syncManager';
import { FINANCE_MONTH_TABS, FINANCE_SHEET_TAB } from '@shared/lib/financeConstants';

export function useAutoSync() {
  const autoSyncEnabled = useAutoSyncStore((s) => s.autoSyncEnabled);
  const autoSyncInterval = useAutoSyncStore((s) => s.autoSyncInterval);

  const setRecords = useFinanceStore((s) => s.setRecords);
  const subs = useSubscriptionStore((s) => s.subs);
  const setSubs = useSubscriptionStore((s) => s.setSubs);

  const [lastAutoSyncTime, setLastAutoSyncTime] = useState(null);
  const syncingRef = useRef(false);
  const subsRef = useRef(subs);
  subsRef.current = subs;

  const doSync = useCallback(async () => {
    if (syncingRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (!SheetsAPI.isConnected()) return;

    const creds = SheetsAPI.getCredentials();
    if (!creds) return;

    syncingRef.current = true;

    try {
      // Pull finance records
      const gidMatch = (creds.sheetsUrl || '').match(/(?:[?#&]gid=)(\d+)/i);
      let financeRecords;
      if (gidMatch) {
        financeRecords = await SheetsAPI.readAllFinancialRecords(creds.spreadsheetId, `gid:${gidMatch[1]}`);
      } else {
        financeRecords = await SheetsAPI.readAllMonthlyRecords(
          creds.spreadsheetId,
          FINANCE_MONTH_TABS
        );

        if (financeRecords.length === 0) {
          financeRecords = await SheetsAPI.readAllFinancialRecords(creds.spreadsheetId, FINANCE_SHEET_TAB);
        }
      }
      setRecords(financeRecords);

      // Pull subscriptions
      const localBudget = (() => {
        try {
          const data = localStorage.getItem('subgrid_budget');
          return data ? JSON.parse(data) : null;
        } catch { return null; }
      })();

      const localTrends = (() => {
        try {
          const data = localStorage.getItem('subgrid_history');
          return data ? JSON.parse(data) : [];
        } catch { return []; }
      })();

      const result = await SyncManager.pullFromSheets(
        creds.spreadsheetId,
        subsRef.current,
        localBudget,
        localTrends
      );

      if (result.merged.subscriptions) {
        setSubs(result.merged.subscriptions);
      }
      if (result.merged.budget) {
        localStorage.setItem('subgrid_budget', JSON.stringify(result.merged.budget));
      }
      if (result.merged.trends) {
        localStorage.setItem('subgrid_history', JSON.stringify(result.merged.trends));
      }

      const now = new Date().toISOString();
      setLastAutoSyncTime(now);

      // Update sync timestamps
      SyncManager.saveSyncState({ lastSyncTime: now, pendingChanges: [] });
    } catch (err) {
      console.warn('Auto-sync failed:', err.message);
    } finally {
      syncingRef.current = false;
    }
  }, [setRecords, setSubs]);

  useEffect(() => {
    if (!autoSyncEnabled) return;
    if (!SheetsAPI.isConnected()) return;

    // Run immediately on enable
    doSync();

    const id = setInterval(doSync, autoSyncInterval);
    const onOnline = () => doSync();
    const onFocus = () => doSync();
    const onVisibilityChange = () => {
      if (!document.hidden) doSync();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [autoSyncEnabled, autoSyncInterval, doSync]);

  return { lastAutoSyncTime };
}
