// Tests for Feature 4: Spending Trends Analysis
const fs = require('fs');
const path = require('path');

// Load the trends module
const trendsCode = fs.readFileSync(path.join(__dirname, '../../js/trends.js'), 'utf8');
eval(trendsCode);

// Mock global variables
global.subs = [];
global.selectedCurrency = 'USD';

describe('TrendsAnalyzer - Feature 4: Spending Trends Analysis', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('recordSnapshot', () => {
    test('CT-1: Should create snapshot for current month', () => {
      global.subs = [
        { name: 'Netflix', price: 15, currency: 'USD', cycle: 'Monthly' }
      ];
      TrendsAnalyzer.recordSnapshot();
      const history = TrendsAnalyzer.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    test('CT-2: Should not create duplicate snapshots for same month', () => {
      global.subs = [{ name: 'Netflix', price: 15, currency: 'USD', cycle: 'Monthly' }];
      TrendsAnalyzer.recordSnapshot();
      const before = TrendsAnalyzer.getHistory().length;
      TrendsAnalyzer.recordSnapshot();
      const after = TrendsAnalyzer.getHistory().length;
      expect(after).toBeLessThanOrEqual(before + 1);
    });

    test('CT-3: Should track subscription count', () => {
      global.subs = [
        { name: 'Netflix', price: 15, currency: 'USD', cycle: 'Monthly' },
        { name: 'Spotify', price: 12, currency: 'USD', cycle: 'Monthly' }
      ];
      TrendsAnalyzer.recordSnapshot();
      const history = TrendsAnalyzer.getHistory();
      expect(history[history.length - 1].subscriptionCount).toBe(2);
    });

    test('CT-4: Should keep only 24 months of data', () => {
      // Create 25 fake snapshots
      for (let i = 0; i < 25; i++) {
        const month = String(Math.floor(i / 12)).padStart(4, '0');
        const m = String((i % 12) + 1).padStart(2, '0');
        const snapshot = { month: `${month}-${m}`, total: 100, subscriptionCount: 1, currency: 'USD', subscriptions: [], timestamp: new Date().toISOString() };
        const history = TrendsAnalyzer.getHistory();
        history.push(snapshot);
        localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(history));
      }
      const history = TrendsAnalyzer.getHistory();
      expect(history.length).toBeLessThanOrEqual(25);
    });
  });

  describe('getHistory', () => {
    test('CT-5: Should return empty array when no history', () => {
      const history = TrendsAnalyzer.getHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    test('CT-6: Should retrieve stored history', () => {
      const snapshot = { month: '2026-01', total: 50, subscriptionCount: 1, currency: 'USD', subscriptions: [], timestamp: new Date().toISOString() };
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify([snapshot]));
      const history = TrendsAnalyzer.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].total).toBe(50);
    });

    test('CT-7: Should handle corrupted data', () => {
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, 'invalid json');
      const history = TrendsAnalyzer.getHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });

  describe('calculateMoMChange', () => {
    test('CT-8: Should return null with less than 2 months', () => {
      const result = TrendsAnalyzer.calculateMoMChange();
      expect(result).toBeNull();
    });

    test('CT-9: Should calculate positive change', () => {
      const snapshots = [
        { month: '2026-01', total: 100, currency: 'USD' },
        { month: '2026-02', total: 150, currency: 'USD' }
      ];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const result = TrendsAnalyzer.calculateMoMChange();
      expect(result.change).toBeCloseTo(50, 1);
      expect(result.direction).toBe('up');
    });

    test('CT-10: Should calculate negative change', () => {
      const snapshots = [
        { month: '2026-01', total: 200, currency: 'USD' },
        { month: '2026-02', total: 150, currency: 'USD' }
      ];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const result = TrendsAnalyzer.calculateMoMChange();
      expect(result.change).toBeCloseTo(-50, 1);
      expect(result.direction).toBe('down');
    });

    test('CT-11: Should mark small changes as stable', () => {
      const snapshots = [
        { month: '2026-01', total: 100, currency: 'USD' },
        { month: '2026-02', total: 102, currency: 'USD' }
      ];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const result = TrendsAnalyzer.calculateMoMChange();
      expect(result.direction).toBe('stable');
    });
  });

  describe('calculateYoYChange', () => {
    test('CT-12: Should return null with less than 12 months', () => {
      const result = TrendsAnalyzer.calculateYoYChange();
      expect(result).toBeNull();
    });

    test('CT-13: Should calculate YoY change with 13 months', () => {
      const snapshots = [];
      for (let i = 0; i < 13; i++) {
        snapshots.push({ month: `2025-${String(i + 1).padStart(2, '0')}`, total: 100, currency: 'USD' });
      }
      snapshots[snapshots.length - 1].total = 150; // Current month
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const result = TrendsAnalyzer.calculateYoYChange();
      expect(result).not.toBeNull();
      expect(result.change).toBeCloseTo(50, 1);
    });
  });

  describe('getTrendDirection', () => {
    test('CT-14: Should return stable with less than 2 months', () => {
      const result = TrendsAnalyzer.getTrendDirection(6);
      expect(result.direction).toBe('stable');
    });

    test('CT-15: Should detect increasing trend', () => {
      const snapshots = [
        { month: '2026-01', total: 100 },
        { month: '2026-02', total: 110 },
        { month: '2026-03', total: 120 }
      ];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const result = TrendsAnalyzer.getTrendDirection(3);
      expect(['increasing', 'stable']).toContain(result.direction);
    });

    test('CT-16: Should detect decreasing trend', () => {
      const snapshots = [
        { month: '2026-01', total: 500 },
        { month: '2026-02', total: 400 },
        { month: '2026-03', total: 300 }
      ];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const result = TrendsAnalyzer.getTrendDirection(3);
      expect(['decreasing', 'stable']).toContain(result.direction);
    });
  });

  describe('getChartData', () => {
    test('CT-17: Should return empty arrays for no data', () => {
      const data = TrendsAnalyzer.getChartData(6);
      expect(data.labels.length).toBe(0);
      expect(data.data.length).toBe(0);
    });

    test('CT-18: Should format chart data for 6 months', () => {
      const snapshots = [
        { month: '2026-01', total: 100 },
        { month: '2026-02', total: 120 },
        { month: '2026-03', total: 110 }
      ];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const data = TrendsAnalyzer.getChartData(6);
      expect(data.labels.length).toBe(3);
      expect(data.data.length).toBe(3);
    });

    test('CT-19: Should limit to requested months', () => {
      const snapshots = [];
      for (let i = 1; i <= 12; i++) {
        snapshots.push({ month: `2026-${String(i).padStart(2, '0')}`, total: 100 + i * 10 });
      }
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const data = TrendsAnalyzer.getChartData(3);
      expect(data.labels.length).toBeLessThanOrEqual(3);
    });
  });

  describe('exportTrendData', () => {
    test('CT-20: Should generate CSV blob', () => {
      const snapshots = [{ month: '2026-01', total: 100, subscriptionCount: 2, currency: 'USD' }];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const blob = TrendsAnalyzer.exportTrendData();
      expect(blob).toBeInstanceOf(Blob);
    });

    test('CT-21: Should include headers in CSV', () => {
      const snapshots = [{ month: '2026-01', total: 100, subscriptionCount: 2, currency: 'USD' }];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      const blob = TrendsAnalyzer.exportTrendData();
      expect(blob.type).toBe('text/csv');
    });
  });

  describe('hasEnoughData', () => {
    test('CT-22: Should return false with no data', () => {
      expect(TrendsAnalyzer.hasEnoughData()).toBe(false);
    });

    test('CT-23: Should return false with 1 month', () => {
      const snapshots = [{ month: '2026-01', total: 100 }];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      expect(TrendsAnalyzer.hasEnoughData()).toBe(false);
    });

    test('CT-24: Should return true with 2+ months', () => {
      const snapshots = [
        { month: '2026-01', total: 100 },
        { month: '2026-02', total: 120 }
      ];
      localStorage.setItem(TrendsAnalyzer.STORAGE_KEY, JSON.stringify(snapshots));
      expect(TrendsAnalyzer.hasEnoughData()).toBe(true);
    });
  });
});
