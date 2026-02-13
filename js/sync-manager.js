// Bidirectional Sync Manager
// Orchestrates pushing/pulling data between SubGrid and Google Sheets

const SyncManager = {
  // State
  syncStatus: 'idle', // 'idle' | 'syncing' | 'error' | 'offline'
  lastSyncTime: null,
  lastErrorMessage: null,
  pendingChanges: [],
  conflictQueue: [],
  syncDebounceTimer: null,
  isOnline: navigator.onLine,

  // Configuration
  SYNC_DEBOUNCE_MS: 2000, // 2 seconds
  RETRY_DELAY_MS: 5000, // 5 seconds initial
  MAX_RETRIES: 3,

  /**
   * Initialize sync manager
   * @returns {Promise<void>}
   */
  async init() {
    // Load stored sync state
    this.loadSyncState();

    // Setup connectivity detection
    window.addEventListener('online', () => this.onConnectionRestored());
    window.addEventListener('offline', () => this.onConnectionLost());

    // Try initial sync if connected
    if (SheetsAPI.getCredentials()) {
      this.updateSyncIndicator();
      // Initial sync is manual (not automatic)
    }
  },

  /**
   * Load sync state from localStorage
   */
  loadSyncState() {
    try {
      const state = localStorage.getItem('_sync_state');
      if (state) {
        const parsed = JSON.parse(state);
        this.lastSyncTime = parsed.lastSyncTime;
        this.pendingChanges = parsed.pendingChanges || [];
      }
    } catch (err) {
      console.warn('Failed to load sync state:', err);
    }
  },

  /**
   * Save sync state to localStorage
   */
  saveSyncState() {
    try {
      localStorage.setItem('_sync_state', JSON.stringify({
        lastSyncTime: this.lastSyncTime,
        pendingChanges: this.pendingChanges
      }));
    } catch (err) {
      console.warn('Failed to save sync state:', err);
    }
  },

  /**
   * Check if Sheets are connected
   * @returns {boolean}
   */
  isConnected() {
    return SheetsAPI.isConnected();
  },

  /**
   * Handle data change (called from save())
   * Queue changes for offline tracking
   */
  onDataChanged() {
    if (!this.isConnected() || this.syncStatus === 'offline') {
      OfflineQueue.addChange('data_modified', {}, new Date().toISOString());
      return;
    }
  },

  /**
   * Pull changes from Google Sheets
   * @returns {Promise<boolean>} - True if successful
   */
  async pullFromSheets() {
    if (!this.isConnected()) {
      console.warn('Not connected to Google Sheets');
      return false;
    }

    try {
      this.setSyncStatus('syncing');

      // Fetch all data from Sheets
      const [cloudSubs, cloudBudget, cloudTrends] = await Promise.all([
        SheetsAPI.readSubscriptions(),
        SheetsAPI.readBudget(),
        SheetsAPI.readTrends()
      ]);

      // Filter out deleted items
      const validCloudSubs = cloudSubs.filter(s => s.id !== '[DELETED]');

      // Detect conflicts
      const conflicts = this.detectConflicts(validCloudSubs);

      if (conflicts.length > 0) {
        // Show conflict resolution modal
        await this.showConflictDialog(conflicts);
      }

      // Merge data (last-write-wins by timestamp)
      const merged = this.mergeData(validCloudSubs, cloudBudget, cloudTrends);

      // Update local state
      if (merged.subscriptions) {
        subs = merged.subscriptions;
      }
      if (merged.budget) {
        localStorage.setItem('subgrid_budget', JSON.stringify(merged.budget));
      }
      if (merged.trends) {
        localStorage.setItem('subgrid_history', JSON.stringify(merged.trends));
      }

      // Trigger UI refresh
      if (typeof renderList === 'function') {
        renderList();
        updateBudgetDisplay();
      }

      this.setSyncStatus('idle');
      this.lastSyncTime = new Date().toISOString();
      this.saveSyncState();

      return true;
    } catch (err) {
      console.error('Pull from Sheets failed:', err);
      this.lastErrorMessage = err.message;
      this.setSyncStatus('error');
      return false;
    }
  },

  /**
   * Detect conflicts between local and cloud data
   * @param {Array} cloudSubs - Subscriptions from cloud
   * @returns {Array} - Conflicting subscriptions
   */
  detectConflicts(cloudSubs) {
    const conflicts = [];

    for (let i = 0; i < cloudSubs.length; i++) {
      const cloudSub = cloudSubs[i];
      const localSub = subs.find(s => s.id === cloudSub.id);

      if (!localSub) continue; // New from cloud, not a conflict

      // Check if both were modified
      const cloudModified = new Date(cloudSub.lastModified || 0).getTime();
      const localModified = new Date(localSub.lastModified || 0).getTime();

      // If modified within last sync window and different, it's a conflict
      if (cloudModified !== localModified && Math.abs(cloudModified - localModified) < 60000) {
        // Check if actual content differs
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
  },

  /**
   * Merge cloud and local data using last-write-wins
   * @param {Array} cloudSubs
   * @param {Object} cloudBudget
   * @param {Array} cloudTrends
   * @returns {Object} - Merged data
   */
  mergeData(cloudSubs, cloudBudget, cloudTrends) {
    const merged = { subscriptions: [], budget: null, trends: [] };

    // Merge subscriptions: keep local if newer, else use cloud
    const seenIds = new Set();

    for (let i = 0; i < subs.length; i++) {
      const localSub = subs[i];
      const cloudSub = cloudSubs.find(s => s.id === localSub.id);

      if (cloudSub) {
        seenIds.add(localSub.id);
        const localTime = new Date(localSub.lastModified || 0).getTime();
        const cloudTime = new Date(cloudSub.lastModified || 0).getTime();

        // Keep the newer version
        merged.subscriptions.push(localTime >= cloudTime ? localSub : cloudSub);
      } else {
        // Local only, keep it
        merged.subscriptions.push(localSub);
      }
    }

    // Add cloud-only subscriptions
    for (let i = 0; i < cloudSubs.length; i++) {
      const cloudSub = cloudSubs[i];
      if (!seenIds.has(cloudSub.id)) {
        merged.subscriptions.push(cloudSub);
      }
    }

    // Merge budget: last-write-wins
    if (cloudBudget) {
      const localBudget = BudgetManager.getBudget();
      if (!localBudget) {
        merged.budget = cloudBudget;
      } else {
        const localTime = new Date(localBudget.lastModified || 0).getTime();
        const cloudTime = new Date(cloudBudget.lastModified || 0).getTime();
        merged.budget = localTime >= cloudTime ? localBudget : cloudBudget;
      }
    }

    // Merge trends by month (no duplicates)
    const trendMap = new Map();
    const localTrends = TrendsAnalyzer ? TrendsAnalyzer.getHistory() : [];

    // Add local trends
    for (let trend of localTrends) {
      trendMap.set(trend.month, trend);
    }

    // Add/update with cloud trends
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
  },

  /**
   * Show conflict resolution dialog
   * @param {Array} conflicts - Array of conflict objects
   * @returns {Promise<void>}
   */
  async showConflictDialog(conflicts) {
    return new Promise((resolve) => {
      // Store the resolve callback for when user makes choice
      window._syncConflictResolve = resolve;

      // Check if the modal-based conflict dialog exists
      if (typeof window.showConflictDialog === 'function') {
        // Use the modal-based UI
        window.showConflictDialog(conflicts);
      } else {
        // Fallback to confirm dialog
        const descriptions = conflicts.map(c =>
          `${c.local.name}: Local (${c.local.lastModified}) vs Cloud (${c.cloud.lastModified})`
        ).join('\n');

        const choice = confirm(
          `${conflicts.length} conflict(s) detected:\n\n${descriptions}\n\nKeep Cloud version? (OK=Cloud, Cancel=Local)`
        );

        // Apply user choice to conflicts
        for (let conflict of conflicts) {
          if (choice) {
            // Keep cloud
            const index = subs.findIndex(s => s.id === conflict.id);
            if (index !== -1) {
              subs[index] = conflict.cloud;
            }
          }
        }

        this.conflictQueue = [];
        resolve();
      }
    });
  },

  /**
   * Manual sync: pull from sheets (read-only)
   * @returns {Promise<void>}
   */
  async manualSync() {
    if (!this.isConnected()) {
      alert('Not connected to Google Sheets. Please add your Sheet URL.');
      return;
    }

    const pullSuccess = await this.pullFromSheets();

    if (pullSuccess) {
      alert('Sync complete!');
    } else {
      alert('Failed to sync: ' + (this.lastErrorMessage || 'Unknown error'));
    }
  },

  /**
   * Handle connection lost
   */
  onConnectionLost() {
    this.isOnline = false;
    this.setSyncStatus('offline');
    console.warn('Connection lost - changes will be queued');
  },

  /**
   * Handle connection restored
   */
  onConnectionRestored() {
    this.isOnline = true;
    console.log('Connection restored - processing queued changes');

    // Process pending queue
    OfflineQueue.processPendingQueue().then(() => {
      if (this.isConnected()) {
        this.pullFromSheets();
      }
    });
  },

  /**
   * Set sync status and update UI
   * @param {string} status
   */
  setSyncStatus(status) {
    this.syncStatus = status;
    this.updateSyncIndicator();
  },

  /**
   * Update sync indicator in UI
   */
  updateSyncIndicator() {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;

    const statusIcon = document.getElementById('sync-status-icon');
    const statusText = document.getElementById('sync-status-text');

    if (!statusIcon || !statusText) return;

    // Update classes
    statusIcon.className = 'status-dot';

    switch (this.syncStatus) {
      case 'syncing':
        statusIcon.classList.add('syncing');
        statusText.textContent = 'Syncing...';
        break;
      case 'idle':
        statusIcon.classList.add('synced');
        statusText.textContent = `Last sync: ${this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleTimeString() : 'Never'}`;
        break;
      case 'error':
        statusIcon.classList.add('error');
        statusText.textContent = 'Sync error';
        break;
      case 'offline':
        statusIcon.classList.add('offline');
        statusText.textContent = 'Offline - queued';
        break;
    }
  }
};
