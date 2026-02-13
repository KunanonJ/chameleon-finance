// Tests for Bidirectional Sync Manager
const fs = require('fs');
const path = require('path');

// Mock dependencies BEFORE loading module
global.fetch = jest.fn();
global.subs = [];
global.renderList = jest.fn();
global.updateBudgetDisplay = jest.fn();
global.save = jest.fn();

global.SheetsAPI = {
  isConnected: jest.fn(() => false),
  getCredentials: jest.fn(() => null),
  readSubscriptions: jest.fn(async () => []),
  readBudget: jest.fn(async () => null),
  readTrends: jest.fn(async () => []),
  batchSync: jest.fn(async () => ({ success: true, syncedAt: new Date().toISOString(), itemsCount: 0 }))
};

global.OfflineQueue = {
  addChange: jest.fn(),
  processPendingQueue: jest.fn(async () => ({ processed: 0, failed: 0 })),
  clearQueue: jest.fn()
};

global.BudgetManager = {
  getBudget: jest.fn(() => null)
};

global.TrendsAnalyzer = {
  getHistory: jest.fn(() => [])
};

// Load sync-manager module
let syncCode = fs.readFileSync(path.join(__dirname, '../../js/sync-manager.js'), 'utf8');
syncCode = syncCode.replace('const SyncManager = {', 'SyncManager = {');
eval(syncCode);

if (typeof SyncManager === 'undefined') {
  throw new Error('SyncManager failed to load');
}

describe('SyncManager - Bidirectional Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
    SyncManager.syncStatus = 'idle';
    SyncManager.lastSyncTime = null;
    SyncManager.pendingChanges = [];
    SyncManager.conflictQueue = [];
    SyncManager.isOnline = true;
    global.subs = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('loadSyncState', () => {
    test('SM-1: Should load sync state from localStorage', () => {
      localStorage.setItem('_sync_state', JSON.stringify({
        lastSyncTime: '2025-06-01T00:00:00Z',
        pendingChanges: [{ type: 'test' }]
      }));

      SyncManager.loadSyncState();
      expect(SyncManager.lastSyncTime).toBe('2025-06-01T00:00:00Z');
      expect(SyncManager.pendingChanges.length).toBe(1);
    });

    test('SM-2: Should handle missing sync state gracefully', () => {
      SyncManager.loadSyncState();
      expect(SyncManager.lastSyncTime).toBeNull();
      expect(SyncManager.pendingChanges).toEqual([]);
    });
  });

  describe('saveSyncState', () => {
    test('SM-3: Should persist lastSyncTime and pendingChanges', () => {
      SyncManager.lastSyncTime = '2025-06-15T12:00:00Z';
      SyncManager.pendingChanges = [{ type: 'test_change' }];

      SyncManager.saveSyncState();

      const stored = JSON.parse(localStorage.getItem('_sync_state'));
      expect(stored.lastSyncTime).toBe('2025-06-15T12:00:00Z');
      expect(stored.pendingChanges.length).toBe(1);
    });
  });

  describe('isConnected', () => {
    test('SM-4: Should delegate to SheetsAPI.isConnected', () => {
      SheetsAPI.isConnected.mockReturnValue(true);
      expect(SyncManager.isConnected()).toBe(true);

      SheetsAPI.isConnected.mockReturnValue(false);
      expect(SyncManager.isConnected()).toBe(false);
    });
  });

  describe('onDataChanged', () => {
    test('SM-5: Should queue to OfflineQueue when not connected', () => {
      SheetsAPI.isConnected.mockReturnValue(false);
      SyncManager.onDataChanged();
      expect(OfflineQueue.addChange).toHaveBeenCalled();
    });

    test('SM-6: Should queue to OfflineQueue when offline', () => {
      SheetsAPI.isConnected.mockReturnValue(true);
      SyncManager.syncStatus = 'offline';
      SyncManager.onDataChanged();
      expect(OfflineQueue.addChange).toHaveBeenCalled();
    });

    test('SM-7: Should debounce push when online and connected', () => {
      SheetsAPI.isConnected.mockReturnValue(true);
      SyncManager.syncStatus = 'idle';

      SyncManager.onDataChanged();

      // Timer should be set but not fired yet
      expect(SyncManager.syncDebounceTimer).not.toBeNull();
    });
  });

  describe('setSyncStatus', () => {
    test('SM-8: Should update syncStatus property', () => {
      SyncManager.setSyncStatus('syncing');
      expect(SyncManager.syncStatus).toBe('syncing');

      SyncManager.setSyncStatus('error');
      expect(SyncManager.syncStatus).toBe('error');
    });
  });

  describe('detectConflicts', () => {
    test('SM-9: Should detect items modified in both places', () => {
      const now = Date.now();
      global.subs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 15.99,
        lastModified: new Date(now - 5000).toISOString()
      }];

      const cloudSubs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 17.99, // Different price
        lastModified: new Date(now - 10000).toISOString()
      }];

      const conflicts = SyncManager.detectConflicts(cloudSubs);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].id).toBe('sub1');
    });

    test('SM-10: Should return empty array when no conflicts', () => {
      global.subs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 15.99,
        lastModified: '2025-06-01T00:00:00Z'
      }];

      const cloudSubs = [{
        id: 'sub2', // Different ID = not a conflict
        name: 'Spotify',
        price: 9.99,
        lastModified: '2025-06-01T00:00:00Z'
      }];

      const conflicts = SyncManager.detectConflicts(cloudSubs);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('mergeData', () => {
    test('SM-11: Should keep local version when local is newer', () => {
      global.subs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 20,
        lastModified: '2025-06-15T12:00:00Z'
      }];

      const cloudSubs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 15,
        lastModified: '2025-06-14T12:00:00Z' // Older
      }];

      const merged = SyncManager.mergeData(cloudSubs, null, []);
      expect(merged.subscriptions[0].price).toBe(20); // Local kept
    });

    test('SM-12: Should keep cloud version when cloud is newer', () => {
      global.subs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 15,
        lastModified: '2025-06-14T12:00:00Z' // Older
      }];

      const cloudSubs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 20,
        lastModified: '2025-06-15T12:00:00Z'
      }];

      const merged = SyncManager.mergeData(cloudSubs, null, []);
      expect(merged.subscriptions[0].price).toBe(20); // Cloud kept
    });

    test('SM-13: Should add cloud-only subscriptions to merged result', () => {
      global.subs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 15,
        lastModified: '2025-06-14T00:00:00Z'
      }];

      const cloudSubs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 15,
        lastModified: '2025-06-14T00:00:00Z'
      }, {
        id: 'sub2',
        name: 'Spotify',
        price: 9.99,
        lastModified: '2025-06-15T00:00:00Z'
      }];

      const merged = SyncManager.mergeData(cloudSubs, null, []);
      expect(merged.subscriptions.length).toBe(2);
    });

    test('SM-14: Should keep local-only subscriptions', () => {
      global.subs = [
        { id: 'sub1', name: 'Netflix', price: 15, lastModified: '2025-06-14T00:00:00Z' },
        { id: 'local-only', name: 'LocalSub', price: 5, lastModified: '2025-06-14T00:00:00Z' }
      ];

      const cloudSubs = [{
        id: 'sub1',
        name: 'Netflix',
        price: 15,
        lastModified: '2025-06-14T00:00:00Z'
      }];

      const merged = SyncManager.mergeData(cloudSubs, null, []);
      expect(merged.subscriptions.length).toBe(2);
      expect(merged.subscriptions.find(s => s.id === 'local-only')).toBeTruthy();
    });
  });

  describe('onConnectionLost / onConnectionRestored', () => {
    test('SM-15: Should set status to offline when connection lost', () => {
      SyncManager.onConnectionLost();
      expect(SyncManager.isOnline).toBe(false);
      expect(SyncManager.syncStatus).toBe('offline');
    });

    test('SM-16: Should set online and process queue when restored', () => {
      SyncManager.onConnectionRestored();
      expect(SyncManager.isOnline).toBe(true);
      expect(OfflineQueue.processPendingQueue).toHaveBeenCalled();
    });
  });
});
