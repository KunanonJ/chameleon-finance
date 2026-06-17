/**
 * Bidirectional Sync Manager
 * Orchestrates pulling data between Open Finance and Google Sheets
 */

import * as SheetsAPI from './sheetsApi';
import * as OfflineQueue from './offlineQueue';

const SYNC_STATE_KEY = '_sync_state';

/**
 * Load sync state from localStorage
 */
export function loadSyncState() {
  try {
    const state = localStorage.getItem(SYNC_STATE_KEY);
    if (state) {
      return JSON.parse(state);
    }
    return { lastSyncTime: null, pendingChanges: [] };
  } catch (err) {
    console.warn('Failed to load sync state:', err);
    return { lastSyncTime: null, pendingChanges: [] };
  }
}

/**
 * Save sync state to localStorage
 */
export function saveSyncState(state) {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify({
      lastSyncTime: state.lastSyncTime,
      pendingChanges: state.pendingChanges || []
    }));
  } catch (err) {
    console.warn('Failed to save sync state:', err);
  }
}

/**
 * Detect conflicts between local and cloud data
 */
export function detectConflicts(cloudSubs, localSubs) {
  const conflicts = [];

  for (let i = 0; i < cloudSubs.length; i++) {
    const cloudSub = cloudSubs[i];
    const localSub = localSubs.find(s => s.id === cloudSub.id);

    if (!localSub) continue;

    const cloudModified = new Date(cloudSub.lastModified || 0).getTime();
    const localModified = new Date(localSub.lastModified || 0).getTime();

    if (cloudModified !== localModified && Math.abs(cloudModified - localModified) < 60000) {
      if (JSON.stringify(cloudSub) !== JSON.stringify(localSub)) {
        conflicts.push({
          id: cloudSub.id,
          local: localSub,
          cloud: cloudSub,
          localTime: localModified,
          cloudTime: cloudModified
        });
      }
    }
  }

  return conflicts;
}

/**
 * Merge cloud and local data using last-write-wins
 */
export function mergeData(localSubs, cloudSubs, localBudget, cloudBudget, localTrends, cloudTrends) {
  const merged = { subscriptions: [], budget: null, trends: [] };

  // Merge subscriptions
  const seenIds = new Set();

  for (let i = 0; i < localSubs.length; i++) {
    const localSub = localSubs[i];
    const cloudSub = cloudSubs.find(s => s.id === localSub.id);

    if (cloudSub) {
      seenIds.add(localSub.id);
      const localTime = new Date(localSub.lastModified || 0).getTime();
      const cloudTime = new Date(cloudSub.lastModified || 0).getTime();
      merged.subscriptions.push(localTime >= cloudTime ? localSub : cloudSub);
    } else {
      merged.subscriptions.push(localSub);
    }
  }

  for (let i = 0; i < cloudSubs.length; i++) {
    const cloudSub = cloudSubs[i];
    if (!seenIds.has(cloudSub.id)) {
      merged.subscriptions.push(cloudSub);
    }
  }

  // Merge budget
  if (cloudBudget) {
    if (!localBudget) {
      merged.budget = cloudBudget;
    } else {
      const localTime = new Date(localBudget.lastModified || 0).getTime();
      const cloudTime = new Date(cloudBudget.lastModified || 0).getTime();
      merged.budget = localTime >= cloudTime ? localBudget : cloudBudget;
    }
  }

  // Merge trends by month
  const trendMap = new Map();

  for (let trend of localTrends) {
    trendMap.set(trend.month, trend);
  }

  for (let trend of (cloudTrends || [])) {
    const existing = trendMap.get(trend.month);
    if (!existing) {
      trendMap.set(trend.month, trend);
    } else {
      const localTime = new Date(existing.lastModified || 0).getTime();
      const cloudTime = new Date(trend.lastModified || 0).getTime();
      if (cloudTime > localTime) {
        trendMap.set(trend.month, trend);
      }
    }
  }

  merged.trends = Array.from(trendMap.values());

  return merged;
}

/**
 * Pull changes from Google Sheets
 * Returns merged data or null on failure
 */
export async function pullFromSheets(spreadsheetId, localSubs, localBudget, localTrends) {
  const [cloudSubs, cloudBudget, cloudTrends] = await Promise.all([
    SheetsAPI.readSubscriptions(spreadsheetId),
    SheetsAPI.readBudget(spreadsheetId),
    SheetsAPI.readTrends(spreadsheetId)
  ]);

  const validCloudSubs = cloudSubs.filter(s => s.id !== '[DELETED]');
  const conflicts = detectConflicts(validCloudSubs, localSubs);
  const merged = mergeData(localSubs, validCloudSubs, localBudget, cloudBudget, localTrends, cloudTrends);

  return { merged, conflicts };
}
