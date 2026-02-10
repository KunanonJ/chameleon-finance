// Budget management and alert system

const BudgetManager = {
  /**
   * Set a monthly budget limit
   * @param {number} amount - Budget amount
   * @param {string} currency - Currency code
   * @returns {Object} - {success: boolean, error?: string}
   */
  setBudget(amount, currency) {
    // Validate input
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { success: false, error: 'Budget must be a number' };
    }

    if (amount <= 0) {
      return { success: false, error: 'Budget must be positive' };
    }

    if (!currencies[currency]) {
      return { success: false, error: 'Invalid currency' };
    }

    const budgetData = {
      amount: amount,
      currency: currency
    };

    try {
      localStorage.setItem('subgrid_budget', JSON.stringify(budgetData));
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Failed to save budget' };
    }
  },

  /**
   * Get the current budget
   * @returns {Object|null} - {amount, currency} or null if not set
   */
  getBudget() {
    try {
      const data = localStorage.getItem('subgrid_budget');
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.warn('Failed to load budget:', err);
      return null;
    }
  },

  /**
   * Remove the budget limit
   */
  removeBudget() {
    try {
      localStorage.removeItem('subgrid_budget');
    } catch (err) {
      console.warn('Failed to remove budget:', err);
    }
  },

  /**
   * Calculate budget usage
   * @param {Array} subscriptions - Array of subscriptions
   * @param {string} selectedCurrency - Currently selected currency
   * @returns {Object} - {total, budget, percentage, status, currency, budgetCurrency}
   */
  calculateUsage(subscriptions, selectedCurrency) {
    const budget = this.getBudget();
    if (!budget) {
      return null;
    }

    // Convert all subscriptions to budget currency and sum
    let totalSpending = 0;

    for (let i = 0; i < subscriptions.length; i++) {
      const sub = subscriptions[i];
      totalSpending += toMonthly(sub);
    }

    // Calculate percentage
    const percentage = (totalSpending / budget.amount) * 100;

    // Determine status
    const status = this.getThresholdStatus(percentage);

    return {
      total: totalSpending,
      budget: budget.amount,
      percentage: Math.round(percentage * 1000) / 1000, // Round to 3 decimal places
      status: status,
      currency: budget.currency,
      budgetCurrency: budget.currency
    };
  },

  /**
   * Get threshold status based on percentage
   * @param {number} percentage - Usage percentage
   * @returns {string} - 'safe', 'warning', 'caution', or 'danger'
   */
  getThresholdStatus(percentage) {
    if (percentage < 80) return 'safe';
    if (percentage < 90) return 'warning';
    if (percentage < 100) return 'caution';
    return 'danger';
  },

  /**
   * Get color for threshold status
   * @param {string} status - Status string
   * @returns {string} - Color code
   */
  getThresholdColor(status) {
    const colors = {
      'safe': '#22c55e',     // green
      'warning': '#eab308',  // yellow
      'caution': '#f97316',  // orange
      'danger': '#ef4444'    // red
    };
    return colors[status] || '#e0e0e0';
  },

  /**
   * Get status message
   * @param {string} status - Status string
   * @returns {string} - Status message
   */
  getStatusMessage(status) {
    const messages = {
      'safe': '✓ Within budget',
      'warning': '⚠ Approaching limit (80%+)',
      'caution': '⚠ Near limit (90%+)',
      'danger': '✗ Over budget (100%+)'
    };
    return messages[status] || '';
  }
};
