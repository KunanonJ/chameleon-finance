// Offline Queue Manager
// Tracks and persists changes made while offline, syncs when reconnected

const OfflineQueue = {
  // Storage key
  QUEUE_KEY: '_offline_queue',

  /**
   * Add change to offline queue
   * @param {string} type - Change type (subscription_add, subscription_edit, budget_set, etc.)
   * @param {Object} data - Change data
   * @param {string} timestamp - ISO timestamp
   */
  addChange(type, data, timestamp) {
    try {
      const queue = this.getQueue();

      const change = {
        id: Date.now() + Math.random(), // Unique ID
        type,
        data,
        timestamp,
        retries: 0,
        lastError: null
      };

      queue.push(change);
      this.saveQueue(queue);

      console.log(`Queued: ${type} (${queue.length} items total)`);
    } catch (err) {
      console.error('Failed to add change to queue:', err);
    }
  },

  /**
   * Get all queued changes
   * @returns {Array} - Array of change objects
   */
  getQueue() {
    try {
      const data = localStorage.getItem(this.QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('Failed to load queue:', err);
      return [];
    }
  },

  /**
   * Save queue to localStorage
   * @param {Array} queue
   */
  saveQueue(queue) {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to save queue:', err);
    }
  },

  /**
   * Clear all queue items (after successful sync)
   */
  clearQueue() {
    try {
      localStorage.removeItem(this.QUEUE_KEY);
      console.log('✓ Offline queue cleared');
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  },

  /**
   * Process pending queue items one by one
   * @returns {Promise<{processed: number, failed: number}>}
   */
  async processPendingQueue() {
    const queue = this.getQueue();

    if (queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    console.log(`Processing ${queue.length} queued changes...`);

    let processed = 0;
    let failed = 0;

    for (let i = 0; i < queue.length; i++) {
      const change = queue[i];

      try {
        const success = await this.processChange(change);

        if (success) {
          processed++;
          // Remove from queue
          queue.splice(i, 1);
          i--; // Adjust index after removal
        } else {
          failed++;
          change.retries++;

          if (change.retries >= 3) {
            console.warn(`Max retries exceeded for: ${change.type}`);
            // Optionally remove after max retries or keep for manual retry
            queue.splice(i, 1);
            i--;
          }
        }
      } catch (err) {
        console.error(`Error processing change: ${err.message}`);
        failed++;
        change.lastError = err.message;
        change.retries++;

        if (change.retries >= 3) {
          queue.splice(i, 1);
          i--;
        }
      }
    }

    this.saveQueue(queue);

    console.log(`Queue processed: ${processed} successful, ${failed} failed`);
    return { processed, failed };
  },

  /**
   * Process a single change based on its type
   * @param {Object} change - Change object with type and data
   * @returns {Promise<boolean>} - True if successful
   */
  async processChange(change) {
    try {
      switch (change.type) {
        case 'subscription_add':
        case 'subscription_edit':
        case 'subscription_delete':
        case 'budget_set':
        case 'budget_clear':
        case 'data_modified':
          // In read-only mode, local changes are tracked but not pushed
          return true;

        case 'sync_failed':
          // Retry pull from sheets
          if (SyncManager.isConnected()) {
            await SyncManager.pullFromSheets();
            return SyncManager.syncStatus === 'idle';
          }
          return false;

        default:
          console.warn(`Unknown change type: ${change.type}`);
          return false;
      }
    } catch (err) {
      console.error(`Failed to process change of type ${change.type}:`, err);
      return false;
    }
  },

  /**
   * Get queue statistics
   * @returns {Object} - {total, byType: {...}}
   */
  getQueueStats() {
    const queue = this.getQueue();
    const stats = {
      total: queue.length,
      byType: {}
    };

    for (let change of queue) {
      if (!stats.byType[change.type]) {
        stats.byType[change.type] = 0;
      }
      stats.byType[change.type]++;
    }

    return stats;
  },

  /**
   * Get UI text for queue status
   * @returns {string} - Display text
   */
  getQueueStatusText() {
    const stats = this.getQueueStats();

    if (stats.total === 0) {
      return 'No pending changes';
    }

    const types = Object.entries(stats.byType)
      .map(([type, count]) => `${count}x ${type}`)
      .join(', ');

    return `${stats.total} pending: ${types}`;
  },

  /**
   * Retry a specific change
   * @param {number|string} changeId - ID of change to retry
   */
  retryChange(changeId) {
    const queue = this.getQueue();
    const change = queue.find(c => c.id === changeId);

    if (change) {
      change.retries = 0;
      change.lastError = null;
      this.saveQueue(queue);
      this.processChange(change);
    }
  },

  /**
   * Clear specific change from queue
   * @param {number|string} changeId
   */
  removeChange(changeId) {
    const queue = this.getQueue();
    const index = queue.findIndex(c => c.id === changeId);

    if (index !== -1) {
      queue.splice(index, 1);
      this.saveQueue(queue);
    }
  }
};
