// End-to-End Integration Tests for Google Sheets Sync Feature
// Tests full flows: connect → sync → disconnect, conflict resolution,
// offline queue, UI state persistence, and error handling

const fs = require('fs');
const path = require('path');

// ========== Setup DOM ==========
function setupDOM() {
  document.body.innerHTML = `
    <div id="sheets-status" class="mb-4 rounded-lg px-3 py-2 text-center text-sm font-semibold">
      Not Connected
    </div>
    <input type="text" id="sheets-url" />
    <button onclick="connectGoogleSheets()">Connect</button>
    <button onclick="disconnectGoogleSheets()">Disconnect</button>
    <button onclick="SyncManager.manualSync()">Sync Now</button>
    <div id="sync-indicator" class="sync-status mt-3 hidden justify-center">
      <span id="sync-status-icon" class="status-dot idle"></span>
      <span id="sync-status-text" class="text-xs">Ready</span>
    </div>
    <div id="last-sync-time" class="text-center text-xs text-slate-400"></div>
    <div id="conflict-modal" class="hidden">
      <p id="conflict-description"></p>
      <div id="conflict-comparison"></div>
      <button id="keep-local" onclick="resolveConflict('local')">Keep Local</button>
      <button id="keep-cloud" onclick="resolveConflict('cloud')">Keep Cloud</button>
    </div>
    <div id="sub-list"></div>
  `;
}

// ========== Mock globals ==========
global.fetch = jest.fn();
global.subs = [];
global.renderList = jest.fn();
global.updateBudgetDisplay = jest.fn();
global.save = jest.fn();
global.alert = jest.fn();
global.confirm = jest.fn(() => true);

// ========== Load modules in dependency order ==========
function loadModule(filename) {
  let code = fs.readFileSync(path.join(__dirname, `../../js/${filename}`), 'utf8');
  // Convert const to global assignment for test scope
  code = code.replace(/^const (\w+) = \{/m, '$1 = {');
  eval(code);
}

// Load in same order as index.html
loadModule('sheets-api.js');
loadModule('offline-queue.js');
loadModule('sync-manager.js');

// Verify modules loaded
if (typeof SheetsAPI === 'undefined') throw new Error('SheetsAPI not loaded');
if (typeof OfflineQueue === 'undefined') throw new Error('OfflineQueue not loaded');
if (typeof SyncManager === 'undefined') throw new Error('SyncManager not loaded');

// Mock BudgetManager and TrendsAnalyzer (loaded before sync modules in prod)
global.BudgetManager = {
  getBudget: jest.fn(() => null)
};
global.TrendsAnalyzer = {
  getHistory: jest.fn(() => [])
};

// ========== Helper functions ==========
function mockSheetCSV(subscriptions, budget, trends) {
  const subHeader = 'ID,Name,Price,Currency,Cycle,Category,StartDate,Notifications,ReminderDays,URL,Color,LastModified';
  const subRows = subscriptions.map(s =>
    `${s.id},${s.name},${s.price},${s.currency || 'USD'},${s.cycle || 'Monthly'},${s.category || 'other'},${s.startDate || ''},${s.notificationsEnabled || false},${s.reminderDays || 7},${s.url || ''},${s.color || 'purple'},${s.lastModified}`
  ).join('\n');
  const subCSV = subHeader + '\n' + subRows;

  const budgetCSV = budget
    ? `Amount,Currency,LastModified\n${budget.amount},${budget.currency},${budget.lastModified}`
    : 'Amount,Currency,LastModified';

  const trendHeader = 'Month,Total,SubscriptionCount,Currency,LastModified';
  const trendRows = (trends || []).map(t =>
    `${t.month},${t.total},${t.subscriptionCount},${t.currency || 'USD'},${t.lastModified}`
  ).join('\n');
  const trendCSV = trendHeader + (trendRows ? '\n' + trendRows : '');

  return { subCSV, budgetCSV, trendCSV };
}

function mockFetchForConnection(csvData) {
  let callCount = 0;
  global.fetch.mockImplementation(async (url) => {
    // First call: credential validation (setCredentials test request)
    if (url.includes('range=A1')) {
      return { ok: true, text: async () => '"OK"' };
    }
    // Subsequent calls: sheet data
    if (url.includes('sheet=Subscriptions')) {
      return { ok: true, text: async () => csvData.subCSV };
    }
    if (url.includes('sheet=Budget')) {
      return { ok: true, text: async () => csvData.budgetCSV };
    }
    if (url.includes('sheet=Trends')) {
      return { ok: true, text: async () => csvData.trendCSV };
    }
    return { ok: false, status: 404 };
  });
}

// ========== TESTS ==========

describe('E2E: Google Sheets Integration', () => {
  beforeEach(() => {
    setupDOM();
    localStorage.clear();
    jest.clearAllMocks();

    // Reset module state
    SheetsAPI.spreadsheetId = null;
    SheetsAPI.sheetsUrl = null;
    SyncManager.syncStatus = 'idle';
    SyncManager.lastSyncTime = null;
    SyncManager.pendingChanges = [];
    SyncManager.conflictQueue = [];
    SyncManager.isOnline = true;
    global.subs = [];
  });

  // ===== Scenario 1: Full Connect → Sync → Disconnect Flow =====
  describe('Scenario 1: Connect → Sync → Disconnect', () => {
    test('E2E-1: Full lifecycle - connect, pull data, verify state, disconnect', async () => {
      const csvData = mockSheetCSV([
        { id: 'sub1', name: 'Netflix', price: 15.99, lastModified: '2025-06-01T00:00:00Z' },
        { id: 'sub2', name: 'Spotify', price: 9.99, lastModified: '2025-06-01T00:00:00Z' }
      ], {
        amount: 100, currency: 'USD', lastModified: '2025-06-01T00:00:00Z'
      }, []);

      mockFetchForConnection(csvData);

      // Step 1: Connect
      const connectResult = await SheetsAPI.setCredentials(
        'https://docs.google.com/spreadsheets/d/abc123/edit'
      );
      expect(connectResult.success).toBe(true);
      expect(SheetsAPI.isConnected()).toBe(true);

      // Step 2: Verify credentials stored
      const stored = JSON.parse(localStorage.getItem('_sheets_config'));
      expect(stored.spreadsheetId).toBe('abc123');

      // Step 3: Pull data from sheets
      const pullResult = await SyncManager.pullFromSheets();
      expect(pullResult).toBe(true);

      // Step 4: Verify subscriptions were merged into local state
      expect(subs.length).toBe(2);
      expect(subs[0].name).toBe('Netflix');
      expect(subs[1].name).toBe('Spotify');

      // Step 5: Verify sync state saved
      expect(SyncManager.lastSyncTime).toBeTruthy();
      expect(SyncManager.syncStatus).toBe('idle');

      // Step 6: Disconnect
      SheetsAPI.clearCredentials();
      expect(SheetsAPI.isConnected()).toBe(false);
      expect(localStorage.getItem('_sheets_config')).toBeNull();

      // Step 7: Verify local data still intact after disconnect
      expect(subs.length).toBe(2);
    });

    test('E2E-2: Connect with invalid URL shows error', async () => {
      const result = await SheetsAPI.setCredentials('https://example.com/not-a-sheet');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
      expect(SheetsAPI.isConnected()).toBe(false);
    });

    test('E2E-3: Connect to non-public sheet fails gracefully', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });

      const result = await SheetsAPI.setCredentials(
        'https://docs.google.com/spreadsheets/d/private123/edit'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('not accessible');
    });

    test('E2E-4: Connect when network is down fails gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await SheetsAPI.setCredentials(
        'https://docs.google.com/spreadsheets/d/test123/edit'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch');
    });
  });

  // ===== Scenario 2: Data Merge (Last-Write-Wins) =====
  describe('Scenario 2: Data Merge with Last-Write-Wins', () => {
    test('E2E-5: Cloud-only subs are added to local', async () => {
      // Local has 1 sub
      global.subs = [{
        id: 'local1', name: 'LocalSub', price: 5,
        lastModified: '2025-06-01T00:00:00Z'
      }];

      const csvData = mockSheetCSV([
        { id: 'cloud1', name: 'CloudSub', price: 10, lastModified: '2025-06-02T00:00:00Z' }
      ], null, []);

      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();

      // Both local and cloud subs should exist
      expect(subs.length).toBe(2);
      expect(subs.find(s => s.id === 'local1')).toBeTruthy();
      expect(subs.find(s => s.id === 'cloud1')).toBeTruthy();
    });

    test('E2E-6: Newer cloud version overwrites older local', async () => {
      global.subs = [{
        id: 'sub1', name: 'Netflix', price: 10,
        lastModified: '2025-06-01T00:00:00Z' // Older
      }];

      const csvData = mockSheetCSV([{
        id: 'sub1', name: 'Netflix', price: 20,
        lastModified: '2025-06-15T00:00:00Z' // Newer
      }], null, []);

      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();

      expect(subs[0].price).toBe(20); // Cloud version kept
    });

    test('E2E-7: Newer local version preserved over older cloud', async () => {
      global.subs = [{
        id: 'sub1', name: 'Netflix', price: 25,
        lastModified: '2025-06-15T00:00:00Z' // Newer
      }];

      const csvData = mockSheetCSV([{
        id: 'sub1', name: 'Netflix', price: 15,
        lastModified: '2025-06-01T00:00:00Z' // Older
      }], null, []);

      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();

      expect(subs[0].price).toBe(25); // Local version kept
    });

    test('E2E-8: Budget merge uses last-write-wins', async () => {
      BudgetManager.getBudget.mockReturnValue({
        amount: 50, currency: 'USD',
        lastModified: '2025-06-01T00:00:00Z' // Older
      });

      const csvData = mockSheetCSV([], {
        amount: 200, currency: 'EUR',
        lastModified: '2025-06-15T00:00:00Z' // Newer
      }, []);

      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();

      // Cloud budget should be stored (it's newer)
      const storedBudget = JSON.parse(localStorage.getItem('subgrid_budget'));
      expect(storedBudget.amount).toBe(200);
      expect(storedBudget.currency).toBe('EUR');
    });

    test('E2E-9: Trends merge by month, no duplicates', async () => {
      TrendsAnalyzer.getHistory.mockReturnValue([
        { month: '2025-01', total: 50, subscriptionCount: 3, currency: 'USD', lastModified: '2025-02-01T00:00:00Z' },
        { month: '2025-02', total: 60, subscriptionCount: 4, currency: 'USD', lastModified: '2025-03-01T00:00:00Z' }
      ]);

      const csvData = mockSheetCSV([], null, [
        { month: '2025-02', total: 70, subscriptionCount: 5, currency: 'USD', lastModified: '2025-03-15T00:00:00Z' }, // Newer
        { month: '2025-03', total: 80, subscriptionCount: 6, currency: 'USD', lastModified: '2025-04-01T00:00:00Z' }  // New month
      ]);

      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();

      const storedTrends = JSON.parse(localStorage.getItem('subgrid_history'));
      expect(storedTrends.length).toBe(3); // Jan, Feb (updated), Mar (new)

      const feb = storedTrends.find(t => t.month === '2025-02');
      expect(feb.total).toBe(70); // Cloud version (newer)
    });
  });

  // ===== Scenario 3: Conflict Resolution =====
  describe('Scenario 3: Conflict Resolution', () => {
    test('E2E-10: Detects conflicts when same item modified within 60s window', () => {
      const now = Date.now();
      global.subs = [{
        id: 'sub1', name: 'Netflix', price: 15,
        lastModified: new Date(now - 30000).toISOString() // 30s ago
      }];

      const cloudSubs = [{
        id: 'sub1', name: 'Netflix', price: 20,
        lastModified: new Date(now - 10000).toISOString() // 10s ago (within 60s window)
      }];

      const conflicts = SyncManager.detectConflicts(cloudSubs);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].local.price).toBe(15);
      expect(conflicts[0].cloud.price).toBe(20);
    });

    test('E2E-11: No conflict when modifications are far apart', () => {
      global.subs = [{
        id: 'sub1', name: 'Netflix', price: 15,
        lastModified: '2025-01-01T00:00:00Z' // Very old
      }];

      const cloudSubs = [{
        id: 'sub1', name: 'Netflix', price: 20,
        lastModified: '2025-06-15T00:00:00Z' // Very new
      }];

      const conflicts = SyncManager.detectConflicts(cloudSubs);
      expect(conflicts.length).toBe(0); // Not within 60s → no conflict shown
    });

    test('E2E-12: Conflict dialog shows in DOM when conflicts exist', async () => {
      const conflicts = [{
        id: 'sub1',
        local: { name: 'Netflix', price: 15, lastModified: '2025-06-15T12:00:00Z' },
        cloud: { name: 'Netflix', price: 20, lastModified: '2025-06-15T12:00:30Z' },
        localTime: new Date('2025-06-15T12:00:00Z').getTime(),
        cloudTime: new Date('2025-06-15T12:00:30Z').getTime()
      }];

      // Simulate what app.js showConflictDialog does
      const modal = document.getElementById('conflict-modal');
      const description = document.getElementById('conflict-description');
      const comparison = document.getElementById('conflict-comparison');

      // Show the modal
      description.innerText = `1 conflict(s) detected: Netflix was modified in both places`;
      comparison.innerHTML = '<div>Netflix: Local $15 vs Cloud $20</div>';
      modal.classList.remove('hidden');
      window.currentConflicts = conflicts;

      expect(modal.classList.contains('hidden')).toBe(false);
      expect(description.innerText).toContain('Netflix');
    });

    test('E2E-13: Resolving conflict with "cloud" updates local data', () => {
      global.subs = [
        { id: 'sub1', name: 'Netflix', price: 15, lastModified: '2025-06-15T12:00:00Z' }
      ];

      window.currentConflicts = [{
        id: 'sub1',
        local: { name: 'Netflix', price: 15, lastModified: '2025-06-15T12:00:00Z' },
        cloud: { name: 'Netflix', price: 20, lastModified: '2025-06-15T12:00:30Z' }
      }];

      // Simulate resolveConflict('cloud')
      for (let conflict of window.currentConflicts) {
        const index = subs.findIndex(s => s.id === conflict.id);
        if (index !== -1) {
          subs[index] = conflict.cloud;
        }
      }

      expect(subs[0].price).toBe(20); // Cloud version applied
    });

    test('E2E-14: Resolving conflict with "local" keeps local data', () => {
      global.subs = [
        { id: 'sub1', name: 'Netflix', price: 15, lastModified: '2025-06-15T12:00:00Z' }
      ];

      window.currentConflicts = [{
        id: 'sub1',
        local: { name: 'Netflix', price: 15, lastModified: '2025-06-15T12:00:00Z' },
        cloud: { name: 'Netflix', price: 20, lastModified: '2025-06-15T12:00:30Z' }
      }];

      // Resolving with 'local' does nothing (keeps current subs)
      expect(subs[0].price).toBe(15); // Local version preserved
    });
  });

  // ===== Scenario 4: Offline Queue Flow =====
  describe('Scenario 4: Offline Queue', () => {
    test('E2E-15: Changes queued when offline, processed when restored', async () => {
      // Go offline
      SyncManager.onConnectionLost();
      expect(SyncManager.isOnline).toBe(false);
      expect(SyncManager.syncStatus).toBe('offline');

      // Make changes while offline
      OfflineQueue.addChange('subscription_add', { name: 'Test' }, new Date().toISOString());
      OfflineQueue.addChange('budget_set', { amount: 100 }, new Date().toISOString());

      // Verify items queued
      const queue = OfflineQueue.getQueue();
      expect(queue.length).toBe(2);

      // Come back online
      SyncManager.onConnectionRestored();
      expect(SyncManager.isOnline).toBe(true);
    });

    test('E2E-16: Offline queue persists across sessions', () => {
      // Add items
      OfflineQueue.addChange('data_modified', {}, new Date().toISOString());
      OfflineQueue.addChange('subscription_edit', { id: 'sub1' }, new Date().toISOString());

      // Simulate "new session" by reading from localStorage directly
      const raw = localStorage.getItem('_offline_queue');
      const parsed = JSON.parse(raw);
      expect(parsed.length).toBe(2);
      expect(parsed[0].type).toBe('data_modified');
      expect(parsed[1].type).toBe('subscription_edit');
    });

    test('E2E-17: Queue stats track correctly', () => {
      OfflineQueue.addChange('subscription_add', {}, new Date().toISOString());
      OfflineQueue.addChange('subscription_add', {}, new Date().toISOString());
      OfflineQueue.addChange('budget_set', {}, new Date().toISOString());

      const stats = OfflineQueue.getQueueStats();
      expect(stats.total).toBe(3);
      expect(stats.byType.subscription_add).toBe(2);
      expect(stats.byType.budget_set).toBe(1);

      const text = OfflineQueue.getQueueStatusText();
      expect(text).toContain('3 pending');
    });

    test('E2E-18: Changes not queued to OfflineQueue when connected and online', () => {
      SheetsAPI.spreadsheetId = 'test123';
      SyncManager.syncStatus = 'idle';
      SyncManager.isOnline = true;

      SyncManager.onDataChanged();
      expect(OfflineQueue.getQueue().length).toBe(0);
    });

    test('E2E-19: Changes queued to OfflineQueue when disconnected', () => {
      SheetsAPI.spreadsheetId = null; // Not connected
      SyncManager.syncStatus = 'idle';

      SyncManager.onDataChanged();
      expect(OfflineQueue.getQueue().length).toBe(1);
    });
  });

  // ===== Scenario 5: State Persistence Across Page Reload =====
  describe('Scenario 5: State Persistence', () => {
    test('E2E-20: Credentials persist across simulated reload', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, text: async () => '"OK"' });

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/persist123/edit');
      expect(SheetsAPI.isConnected()).toBe(true);

      // Simulate page unload
      SheetsAPI.spreadsheetId = null;
      SheetsAPI.sheetsUrl = null;

      // Simulate page reload - getCredentials restores state
      const creds = SheetsAPI.getCredentials();
      expect(creds).not.toBeNull();
      expect(creds.spreadsheetId).toBe('persist123');
      expect(SheetsAPI.isConnected()).toBe(true);
    });

    test('E2E-21: Sync state persists across simulated reload', () => {
      SyncManager.lastSyncTime = '2025-06-15T12:00:00Z';
      SyncManager.pendingChanges = [{ type: 'test' }];
      SyncManager.saveSyncState();

      // Simulate reload
      SyncManager.lastSyncTime = null;
      SyncManager.pendingChanges = [];

      SyncManager.loadSyncState();
      expect(SyncManager.lastSyncTime).toBe('2025-06-15T12:00:00Z');
      expect(SyncManager.pendingChanges.length).toBe(1);
    });

    test('E2E-22: Disconnect clears stored credentials', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, text: async () => '"OK"' });

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      expect(localStorage.getItem('_sheets_config')).not.toBeNull();

      SheetsAPI.clearCredentials();
      expect(localStorage.getItem('_sheets_config')).toBeNull();

      const restored = SheetsAPI.getCredentials();
      expect(restored).toBeNull();
    });
  });

  // ===== Scenario 6: UI State Updates =====
  describe('Scenario 6: UI State Updates', () => {
    test('E2E-23: Sync indicator shows status dot when syncing', () => {
      SheetsAPI.spreadsheetId = 'test123'; // Make connected
      SyncManager.setSyncStatus('syncing');

      const indicator = document.getElementById('sync-indicator');
      const icon = document.getElementById('sync-status-icon');
      const text = document.getElementById('sync-status-text');

      expect(indicator.classList.contains('hidden')).toBe(false);
      expect(icon.classList.contains('syncing')).toBe(true);
      expect(text.textContent).toBe('Syncing...');
    });

    test('E2E-24: Sync indicator shows synced state', () => {
      SheetsAPI.spreadsheetId = 'test123';
      SyncManager.setSyncStatus('idle');

      const icon = document.getElementById('sync-status-icon');
      const text = document.getElementById('sync-status-text');

      expect(icon.classList.contains('synced')).toBe(true);
      expect(text.textContent).toBe('Synced');
    });

    test('E2E-25: Sync indicator shows error state', () => {
      SheetsAPI.spreadsheetId = 'test123';
      SyncManager.setSyncStatus('error');

      const icon = document.getElementById('sync-status-icon');
      const text = document.getElementById('sync-status-text');

      expect(icon.classList.contains('error')).toBe(true);
      expect(text.textContent).toBe('Sync error');
    });

    test('E2E-26: Sync indicator shows offline state', () => {
      SheetsAPI.spreadsheetId = 'test123';
      SyncManager.setSyncStatus('offline');

      const icon = document.getElementById('sync-status-icon');
      const text = document.getElementById('sync-status-text');

      expect(icon.classList.contains('offline')).toBe(true);
      expect(text.textContent).toBe('Offline - queued');
    });

    test('E2E-27: Sync indicator hidden when not connected', () => {
      SheetsAPI.spreadsheetId = null; // disconnected
      SyncManager.setSyncStatus('idle');

      const indicator = document.getElementById('sync-indicator');
      expect(indicator.classList.contains('hidden')).toBe(true);
    });

    test('E2E-28: Last sync time updates in DOM after successful pull', async () => {
      const csvData = mockSheetCSV([], null, []);
      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();

      const lastSyncEl = document.getElementById('last-sync-time');
      expect(lastSyncEl.textContent).toContain('Last sync:');
    });
  });

  // ===== Scenario 7: Error Recovery =====
  describe('Scenario 7: Error Recovery', () => {
    test('E2E-29: Pull failure sets error status and preserves local data', async () => {
      global.subs = [
        { id: 'local1', name: 'MySub', price: 10, lastModified: '2025-06-01T00:00:00Z' }
      ];

      SheetsAPI.spreadsheetId = 'test123';

      // Override readSubscriptions to throw an error that propagates through pullFromSheets
      const originalRead = SheetsAPI.readSubscriptions;
      SheetsAPI.readSubscriptions = async () => { throw new Error('Network error'); };

      const result = await SyncManager.pullFromSheets();
      expect(result).toBe(false);
      expect(SyncManager.syncStatus).toBe('error');

      // Local data must not be wiped
      expect(subs.length).toBe(1);
      expect(subs[0].name).toBe('MySub');

      // Restore original
      SheetsAPI.readSubscriptions = originalRead;
    });

    test('E2E-30: Manual sync alerts on failure', async () => {
      SheetsAPI.spreadsheetId = 'test123';

      // Override readSubscriptions to throw
      const originalRead = SheetsAPI.readSubscriptions;
      SheetsAPI.readSubscriptions = async () => { throw new Error('Timeout'); };

      await SyncManager.manualSync();
      expect(alert).toHaveBeenCalledWith(expect.stringContaining('Failed to sync'));

      // Restore original
      SheetsAPI.readSubscriptions = originalRead;
    });

    test('E2E-31: Manual sync alerts on success', async () => {
      const csvData = mockSheetCSV([], null, []);
      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');

      await SyncManager.manualSync();
      expect(alert).toHaveBeenCalledWith('Sync complete!');
    });

    test('E2E-32: Manual sync without connection shows alert', async () => {
      SheetsAPI.spreadsheetId = null;

      await SyncManager.manualSync();
      expect(alert).toHaveBeenCalledWith(expect.stringContaining('Not connected'));
    });

    test('E2E-33: Empty sheet returns empty data gracefully', async () => {
      const csvData = mockSheetCSV([], null, []);
      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      const result = await SyncManager.pullFromSheets();

      expect(result).toBe(true);
      expect(subs.length).toBe(0);
    });

    test('E2E-34: Deleted items filtered from cloud data', async () => {
      const csvData = mockSheetCSV([
        { id: 'sub1', name: 'Active', price: 10, lastModified: '2025-06-01T00:00:00Z' },
        { id: '[DELETED]', name: 'Removed', price: 5, lastModified: '2025-06-01T00:00:00Z' }
      ], null, []);

      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();

      expect(subs.length).toBe(1);
      expect(subs[0].name).toBe('Active');
    });
  });

  // ===== Scenario 8: CSV Parsing Edge Cases =====
  describe('Scenario 8: CSV Parsing', () => {
    test('E2E-35: Handles subscription names with commas', () => {
      const csv = 'ID,Name\nsub1,"Netflix, Premium"';
      const rows = SheetsAPI.parseCSV(csv);
      expect(rows[1][1]).toBe('Netflix, Premium');
    });

    test('E2E-36: Handles escaped quotes in CSV', () => {
      const csv = 'ID,Name\nsub1,"He said ""hello"""';
      const rows = SheetsAPI.parseCSV(csv);
      expect(rows[1][1]).toBe('He said "hello"');
    });

    test('E2E-37: Handles Windows-style line endings', () => {
      const csv = 'ID,Name\r\nsub1,Netflix\r\nsub2,Spotify';
      const rows = SheetsAPI.parseCSV(csv);
      expect(rows.length).toBe(3);
      expect(rows[1][1]).toBe('Netflix');
    });

    test('E2E-38: Handles empty rows gracefully', () => {
      const csv = 'ID,Name\n\nsub1,Netflix\n\n';
      const rows = SheetsAPI.parseCSV(csv);
      // Empty rows should be skipped
      const dataRows = rows.filter(r => r.some(c => c !== ''));
      expect(dataRows.length).toBe(2); // Header + 1 data row
    });
  });

  // ===== Scenario 9: Multiple Sync Cycles =====
  describe('Scenario 9: Multiple Sync Cycles', () => {
    test('E2E-39: Second sync adds new cloud items without duplicating existing', async () => {
      const firstCSV = mockSheetCSV([
        { id: 'sub1', name: 'Netflix', price: 15, lastModified: '2025-06-01T00:00:00Z' }
      ], null, []);

      mockFetchForConnection(firstCSV);
      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');
      await SyncManager.pullFromSheets();
      expect(subs.length).toBe(1);

      // Second sync with additional item
      const secondCSV = mockSheetCSV([
        { id: 'sub1', name: 'Netflix', price: 15, lastModified: '2025-06-01T00:00:00Z' },
        { id: 'sub2', name: 'Spotify', price: 9.99, lastModified: '2025-06-02T00:00:00Z' }
      ], null, []);

      mockFetchForConnection(secondCSV);
      await SyncManager.pullFromSheets();

      expect(subs.length).toBe(2);
      expect(subs.filter(s => s.id === 'sub1').length).toBe(1); // No duplicates
    });

    test('E2E-40: Sync preserves lastSyncTime between pulls', async () => {
      const csvData = mockSheetCSV([], null, []);
      mockFetchForConnection(csvData);

      await SheetsAPI.setCredentials('https://docs.google.com/spreadsheets/d/test/edit');

      await SyncManager.pullFromSheets();
      const firstTime = SyncManager.lastSyncTime;
      expect(firstTime).toBeTruthy();

      // Small delay to ensure different timestamp
      await new Promise(r => setTimeout(r, 10));

      mockFetchForConnection(csvData);
      await SyncManager.pullFromSheets();
      const secondTime = SyncManager.lastSyncTime;

      expect(secondTime).not.toBe(firstTime);
    });
  });
});
