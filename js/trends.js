// Spending trends analysis and historical data tracking

const TrendsAnalyzer = {
  STORAGE_KEY: "subgrid_history",

  /**
   * Record a monthly snapshot of spending
   */
  recordSnapshot() {
    const today = new Date();
    const monthKey = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0");

    let history = this.getHistory();

    // Calculate current spending
    let totalSpending = 0;
    for (let i = 0; i < subs.length; i++) {
      totalSpending += toMonthly(subs[i]);
    }

    // Remove duplicate month if exists
    history = history.filter(h => h.month !== monthKey);

    // Add new snapshot
    const snapshot = {
      month: monthKey,
      total: Math.round(totalSpending * 100) / 100,
      currency: selectedCurrency,
      subscriptionCount: subs.length,
      subscriptions: subs.map(s => ({
        id: s.id,
        name: s.name,
        price: s.price,
        currency: s.currency,
        cycle: s.cycle,
        category: s.category
      })),
      timestamp: new Date().toISOString()
    };

    history.push(snapshot);

    // Keep only last 24 months (2 years of data)
    if (history.length > 24) {
      history = history.slice(-24);
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
      if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") {
        console.warn("Storage quota exceeded - trend data not saved");
      } else {
        console.warn("Failed to save history snapshot:", err);
      }
    }
  },

  /**
   * Get historical data
   * @returns {Array} - Array of monthly snapshots
   */
  getHistory() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn("Failed to load history:", err);
      return [];
    }
  },

  /**
   * Calculate month-over-month change
   * @returns {Object|null} - {change, percentage, direction} or null if not enough data
   */
  calculateMoMChange() {
    const history = this.getHistory();
    if (history.length < 2) return null;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    // Guard against division by zero
    if (previous.total === 0) return null;

    const change = current.total - previous.total;
    const percentage = (change / previous.total) * 100;
    const direction = Math.abs(percentage) < 5 ? "stable" : percentage > 0 ? "up" : "down";

    return {
      change: Math.round(change * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
      direction: direction,
      current: current.total,
      previous: previous.total
    };
  },

  /**
   * Calculate year-over-year change
   * @returns {Object|null} - {change, percentage, direction} or null if not enough data
   */
  calculateYoYChange() {
    const history = this.getHistory();
    if (history.length < 12) return null;

    const current = history[history.length - 1];
    const yearAgo = history[history.length - 13] || history[0];

    if (!yearAgo) return null;

    // Guard against division by zero
    if (yearAgo.total === 0) return null;

    const change = current.total - yearAgo.total;
    const percentage = (change / yearAgo.total) * 100;
    const direction = Math.abs(percentage) < 5 ? "stable" : percentage > 0 ? "up" : "down";

    return {
      change: Math.round(change * 100) / 100,
      percentage: Math.round(percentage * 10) / 10,
      direction: direction,
      current: current.total,
      previous: yearAgo.total
    };
  },

  /**
   * Detect spending trend direction
   * @param {number} months - How many recent months to analyze
   * @returns {Object} - {direction: 'increasing'|'decreasing'|'stable', strength}
   */
  getTrendDirection(months = 6) {
    const history = this.getHistory();
    if (history.length < 2) {
      return { direction: "stable", strength: 0 };
    }

    const recentData = history.slice(-Math.min(months, history.length));
    if (recentData.length < 2) {
      return { direction: "stable", strength: 0 };
    }

    // Simple linear regression
    const n = recentData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = recentData[i].total;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    const trendStrength = Math.abs(slope / avgY);

    let direction = "stable";
    if (trendStrength > 0.01) {
      direction = slope > 0 ? "increasing" : "decreasing";
    }

    return {
      direction: direction,
      strength: Math.round(trendStrength * 100) / 100
    };
  },

  /**
   * Get chart data for visualization
   * @param {number} months - Number of recent months to include
   * @returns {Object} - {labels, data} for charting
   */
  getChartData(months = 6) {
    const history = this.getHistory();
    const recent = history.slice(-months);

    if (recent.length === 0) {
      return { labels: [], data: [] };
    }

    const labels = recent.map(h => {
      const [year, month] = h.month.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return monthNames[parseInt(month) - 1];
    });

    const data = recent.map(h => h.total);

    return { labels, data };
  },

  /**
   * Export trend data as CSV
   * @returns {Blob} - CSV file blob
   */
  exportTrendData() {
    const history = this.getHistory();

    let csv = "Month,Total Spending,Subscription Count,Currency\n";

    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      csv += `"${h.month}","${h.total}","${h.subscriptionCount}","${h.currency}"\n`;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    return blob;
  },

  /**
   * Download trend data as CSV file
   */
  downloadTrendData() {
    const blob = this.exportTrendData();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "subgrid-trends-" + new Date().toISOString().split("T")[0] + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Check if we have enough data to show trends
   * @returns {boolean} - True if we have at least 2 months of data
   */
  hasEnoughData() {
    return this.getHistory().length >= 2;
  },

  /**
   * Get average monthly spending
   * @param {number} months - Number of months to average
   * @returns {number} - Average spending
   */
  getAverageSpending(months = 6) {
    const history = this.getHistory();
    const recent = history.slice(-months);

    if (recent.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < recent.length; i++) {
      sum += recent[i].total;
    }

    return Math.round((sum / recent.length) * 100) / 100;
  },

  /**
   * Get min and max spending from history
   * @param {number} months - Number of months to analyze
   * @returns {Object} - {min, max}
   */
  getSpendingRange(months = 12) {
    const history = this.getHistory();
    const recent = history.slice(-months);

    if (recent.length === 0) {
      return { min: 0, max: 0 };
    }

    let min = recent[0].total;
    let max = recent[0].total;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i].total < min) min = recent[i].total;
      if (recent[i].total > max) max = recent[i].total;
    }

    return { min, max };
  }
};
