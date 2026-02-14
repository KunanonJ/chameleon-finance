import { useMemo, useCallback } from 'react';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useCurrencyStore } from '@store/currencyStore';
import { toMonthly } from '@shared/lib/currencies';

export const STORAGE_KEY = 'subgrid_history';

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn('Storage quota exceeded - trend data not saved');
    }
  }
}

export function calculateMoMChange() {
  const history = getHistory();
  if (history.length < 2) return null;

  const current = history[history.length - 1];
  const previous = history[history.length - 2];

  if (previous.total === 0) return null;

  const change = current.total - previous.total;
  const percentage = (change / previous.total) * 100;
  const direction = Math.abs(percentage) < 5 ? 'stable' : percentage > 0 ? 'up' : 'down';

  return {
    change: Math.round(change * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
    direction,
    current: current.total,
    previous: previous.total
  };
}

export function calculateYoYChange() {
  const history = getHistory();
  if (history.length < 12) return null;

  const current = history[history.length - 1];
  const yearAgo = history[history.length - 13] || history[0];

  if (!yearAgo || yearAgo.total === 0) return null;

  const change = current.total - yearAgo.total;
  const percentage = (change / yearAgo.total) * 100;
  const direction = Math.abs(percentage) < 5 ? 'stable' : percentage > 0 ? 'up' : 'down';

  return {
    change: Math.round(change * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
    direction,
    current: current.total,
    previous: yearAgo.total
  };
}

export function calculateTrendDirection(months = 6) {
  const history = getHistory();
  if (history.length < 2) return { direction: 'stable', strength: 0 };

  const recentData = history.slice(-months);
  if (recentData.length < 2) return { direction: 'stable', strength: 0 };

  const n = recentData.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += recentData[i].total;
    sumXY += i * recentData[i].total;
    sumX2 += i * i;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgY = sumY / n;
  const trendStrength = Math.abs(slope / avgY);

  let direction = 'stable';
  if (trendStrength > 0.01) {
    direction = slope > 0 ? 'increasing' : 'decreasing';
  }

  return { direction, strength: Math.round(trendStrength * 100) / 100 };
}

export function getChartData(months = 6) {
  const history = getHistory();
  const recent = history.slice(-months);

  if (recent.length === 0) return { labels: [], data: [] };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labels = recent.map(h => {
    const [, month] = h.month.split('-');
    return monthNames[parseInt(month) - 1];
  });
  const data = recent.map(h => h.total);

  return { labels, data };
}

export function hasEnoughData() {
  return getHistory().length >= 2;
}

export function exportTrendData() {
  const history = getHistory();
  let csv = 'Month,Total Spending,Subscription Count,Currency\n';
  for (const h of history) {
    csv += `"${h.month}","${h.total}","${h.subscriptionCount}","${h.currency}"\n`;
  }
  return new Blob([csv], { type: 'text/csv' });
}

export function useTrends() {
  const subs = useSubscriptionStore((s) => s.subs);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const recordSnapshot = useCallback(() => {
    const today = new Date();
    const monthKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

    let history = getHistory();

    let totalSpending = 0;
    for (let i = 0; i < subs.length; i++) {
      totalSpending += toMonthly(subs[i], selectedCurrency, currencies);
    }

    history = history.filter(h => h.month !== monthKey);

    const snapshot = {
      month: monthKey,
      total: Math.round(totalSpending * 100) / 100,
      currency: selectedCurrency,
      subscriptionCount: subs.length,
      subscriptions: subs.map(s => ({
        id: s.id, name: s.name, price: s.price,
        currency: s.currency, cycle: s.cycle, category: s.category
      })),
      timestamp: new Date().toISOString()
    };

    history.push(snapshot);

    if (history.length > 24) {
      history = history.slice(-24);
    }

    saveHistory(history);
  }, [subs, selectedCurrency, currencies]);

  const mom = useMemo(() => calculateMoMChange(), [subs]);
  const yoy = useMemo(() => calculateYoYChange(), [subs]);
  const trendDirection = useMemo(() => calculateTrendDirection(6), [subs]);
  const _hasEnoughData = useMemo(() => hasEnoughData(), [subs]);
  const chartData = useMemo(() => getChartData(6), [subs]);

  const downloadTrendData = useCallback(() => {
    const blob = exportTrendData();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chameleon-trends-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    mom,
    yoy,
    trendDirection,
    hasEnoughData: _hasEnoughData,
    chartData,
    recordSnapshot,
    downloadTrendData,
    getHistory,
  };
}
