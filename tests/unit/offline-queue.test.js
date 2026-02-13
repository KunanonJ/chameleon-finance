// Tests for Offline Queue Manager
const fs = require('fs');
const path = require('path');

// Mock dependencies BEFORE loading module
global.SheetsAPI = {
  isConnected: jest.fn(() => true)
};

global.SyncManager = {
  isConnected: jest.fn(() => true),
  pullFromSheets: jest.fn(async () => true),
  syncStatus: 'idle'
};

// Load offline-queue module
let queueCode = fs.readFileSync(path.join(__dirname, '../../js/offline-queue.js'), 'utf8');
queueCode = queueCode.replace('const OfflineQueue = {', 'OfflineQueue = {');
eval(queueCode);

if (typeof OfflineQueue === 'undefined') {
  throw new Error('OfflineQueue failed to load');
}

describe('OfflineQueue - Change Persistence & Replay', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('addChange', () => {
    test('OQ-1: Should add item to queue in localStorage', () => {
      OfflineQueue.addChange('subscription_add', { name: 'Test' }, '2025-06-01T00:00:00Z');

      const queue = OfflineQueue.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('subscription_add');
      expect(queue[0].data.name).toBe('Test');
    });

    test('OQ-2: Should increment queue size with each addition', () => {
      OfflineQueue.addChange('subscription_add', {}, '2025-06-01T00:00:00Z');
      OfflineQueue.addChange('budget_set', {}, '2025-06-01T00:01:00Z');
      OfflineQueue.addChange('data_modified', {}, '2025-06-01T00:02:00Z');

      const queue = OfflineQueue.getQueue();
      expect(queue.length).toBe(3);
    });

    test('OQ-3: Should store each change with unique ID', () => {
      OfflineQueue.addChange('test1', {}, '2025-06-01T00:00:00Z');
      OfflineQueue.addChange('test2', {}, '2025-06-01T00:00:01Z');

      const queue = OfflineQueue.getQueue();
      expect(queue[0].id).not.toBe(queue[1].id);
    });

    test('OQ-4: Should initialize retries to 0', () => {
      OfflineQueue.addChange('test', {}, '2025-06-01T00:00:00Z');

      const queue = OfflineQueue.getQueue();
      expect(queue[0].retries).toBe(0);
      expect(queue[0].lastError).toBeNull();
    });
  });

  describe('getQueue', () => {
    test('OQ-5: Should return empty array when no items', () => {
      const queue = OfflineQueue.getQueue();
      expect(queue).toEqual([]);
    });

    test('OQ-6: Should return stored queue items', () => {
      const testQueue = [
        { id: 1, type: 'test', data: {}, timestamp: '2025-06-01T00:00:00Z', retries: 0, lastError: null }
      ];
      localStorage.setItem(OfflineQueue.QUEUE_KEY, JSON.stringify(testQueue));

      const queue = OfflineQueue.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('test');
    });

    test('OQ-7: Should handle corrupted localStorage gracefully', () => {
      localStorage.setItem(OfflineQueue.QUEUE_KEY, 'not valid json');

      const queue = OfflineQueue.getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('clearQueue', () => {
    test('OQ-8: Should remove all items from localStorage', () => {
      OfflineQueue.addChange('test', {}, '2025-06-01T00:00:00Z');
      expect(OfflineQueue.getQueue().length).toBe(1);

      OfflineQueue.clearQueue();
      expect(OfflineQueue.getQueue().length).toBe(0);
      expect(localStorage.getItem(OfflineQueue.QUEUE_KEY)).toBeNull();
    });
  });

  describe('getQueueStats', () => {
    test('OQ-9: Should return correct count by type', () => {
      OfflineQueue.addChange('subscription_add', {}, '2025-06-01T00:00:00Z');
      OfflineQueue.addChange('subscription_add', {}, '2025-06-01T00:00:01Z');
      OfflineQueue.addChange('budget_set', {}, '2025-06-01T00:00:02Z');

      const stats = OfflineQueue.getQueueStats();
      expect(stats.total).toBe(3);
      expect(stats.byType.subscription_add).toBe(2);
      expect(stats.byType.budget_set).toBe(1);
    });

    test('OQ-10: Should return zero total when empty', () => {
      const stats = OfflineQueue.getQueueStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('getQueueStatusText', () => {
    test('OQ-11: Should return "No pending changes" when empty', () => {
      const text = OfflineQueue.getQueueStatusText();
      expect(text).toBe('No pending changes');
    });

    test('OQ-12: Should return count and types when items exist', () => {
      OfflineQueue.addChange('subscription_add', {}, '2025-06-01T00:00:00Z');
      OfflineQueue.addChange('budget_set', {}, '2025-06-01T00:00:01Z');

      const text = OfflineQueue.getQueueStatusText();
      expect(text).toContain('2 pending');
    });
  });

  describe('removeChange', () => {
    test('OQ-13: Should remove specific item by ID', () => {
      OfflineQueue.addChange('test1', {}, '2025-06-01T00:00:00Z');
      OfflineQueue.addChange('test2', {}, '2025-06-01T00:00:01Z');

      const queue = OfflineQueue.getQueue();
      const idToRemove = queue[0].id;

      OfflineQueue.removeChange(idToRemove);

      const updated = OfflineQueue.getQueue();
      expect(updated.length).toBe(1);
      expect(updated[0].type).toBe('test2');
    });

    test('OQ-14: Should do nothing for non-existent ID', () => {
      OfflineQueue.addChange('test1', {}, '2025-06-01T00:00:00Z');

      OfflineQueue.removeChange('nonexistent');

      const queue = OfflineQueue.getQueue();
      expect(queue.length).toBe(1);
    });
  });

  describe('processChange', () => {
    test('OQ-15: Should return true for data_modified type', async () => {
      const result = await OfflineQueue.processChange({ type: 'data_modified', data: {} });
      expect(result).toBe(true);
    });

    test('OQ-16: Should return true for subscription_delete in read-only mode', async () => {
      const result = await OfflineQueue.processChange({
        type: 'subscription_delete',
        data: { id: 'sub123' }
      });
      // In read-only mode, all local change types return true (tracked but not pushed)
      expect(result).toBe(true);
    });

    test('OQ-17: Should return false for unknown type', async () => {
      const result = await OfflineQueue.processChange({ type: 'unknown_type', data: {} });
      expect(result).toBe(false);
    });
  });
});
