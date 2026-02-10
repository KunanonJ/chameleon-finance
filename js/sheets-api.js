// Google Sheets API v4 Wrapper
// Handles all read/write operations to Google Sheets

const SheetsAPI = {
  // Configuration
  spreadsheetId: null,
  apiKey: null,
  sheetsUrl: null,
  API_BASE: 'https://sheets.googleapis.com/v4/spreadsheets',

  /**
   * Extract spreadsheet ID from Google Sheets URL
   * @param {string} sheetsUrl - URL like https://docs.google.com/spreadsheets/d/{id}/edit
   * @returns {string|null} - Spreadsheet ID or null if invalid
   */
  extractSpreadsheetId(sheetsUrl) {
    try {
      const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (err) {
      console.warn('Failed to extract spreadsheet ID:', err);
      return null;
    }
  },

  /**
   * Set and validate credentials
   * @param {string} sheetUrl - Google Sheet URL
   * @param {string} apiKey - Google API Key
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setCredentials(sheetUrl, apiKey) {
    try {
      this.spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!this.spreadsheetId) {
        return { success: false, error: 'Invalid Google Sheets URL' };
      }

      this.apiKey = apiKey;
      this.sheetsUrl = sheetUrl;

      // Test credentials with a simple read request
      const testUrl = `${this.API_BASE}/${this.spreadsheetId}?key=${this.apiKey}`;
      const response = await fetch(testUrl);

      if (!response.ok) {
        return { success: false, error: 'Invalid API Key or Sheet not accessible' };
      }

      // Ensure sheets exist, create if needed
      await this.ensureSheetsExist();

      // Store credentials in localStorage
      localStorage.setItem('_sheets_config', JSON.stringify({
        spreadsheetId: this.spreadsheetId,
        apiKey: this.apiKey,
        sheetsUrl: this.sheetsUrl,
        connectedAt: new Date().toISOString()
      }));

      return { success: true };
    } catch (err) {
      console.error('Failed to set credentials:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get stored credentials
   * @returns {{spreadsheetId: string, apiKey: string, sheetsUrl: string}|null}
   */
  getCredentials() {
    try {
      const stored = localStorage.getItem('_sheets_config');
      if (!stored) return null;

      const config = JSON.parse(stored);
      this.spreadsheetId = config.spreadsheetId;
      this.apiKey = config.apiKey;
      this.sheetsUrl = config.sheetsUrl;

      return config;
    } catch (err) {
      console.warn('Failed to retrieve credentials:', err);
      return null;
    }
  },

  /**
   * Clear credentials
   */
  clearCredentials() {
    this.spreadsheetId = null;
    this.apiKey = null;
    this.sheetsUrl = null;
    localStorage.removeItem('_sheets_config');
  },

  /**
   * Ensure required sheets exist, create if needed
   * @returns {Promise<void>}
   */
  async ensureSheetsExist() {
    const requiredSheets = ['Subscriptions', 'Budget', 'Trends'];
    // This is handled server-side in production
    // For now, we'll rely on user to create sheets
  },

  /**
   * Read subscriptions from Google Sheet
   * @returns {Promise<Array>}
   */
  async readSubscriptions() {
    try {
      const range = 'Subscriptions!A2:L'; // Skip header row
      const url = `${this.API_BASE}/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const rows = data.values || [];

      return rows.map(row => ({
        id: row[0],
        name: row[1],
        price: parseFloat(row[2]) || 0,
        currency: row[3] || 'USD',
        cycle: row[4] || 'Monthly',
        category: row[5] || 'other',
        startDate: row[6] || '',
        notificationsEnabled: row[7] === 'true' || row[7] === true,
        reminderDays: parseInt(row[8]) || 7,
        url: row[9] || '',
        color: row[10] || 'purple',
        lastModified: row[11] || new Date().toISOString()
      }));
    } catch (err) {
      console.error('Failed to read subscriptions:', err);
      return [];
    }
  },

  /**
   * Read budget from Google Sheet
   * @returns {Promise<{amount: number, currency: string, lastModified: string}|null>}
   */
  async readBudget() {
    try {
      const range = 'Budget!A2:C2'; // Single row
      const url = `${this.API_BASE}/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const row = data.values?.[0];

      if (!row) return null;

      return {
        amount: parseFloat(row[0]) || 0,
        currency: row[1] || 'USD',
        lastModified: row[2] || new Date().toISOString()
      };
    } catch (err) {
      console.error('Failed to read budget:', err);
      return null;
    }
  },

  /**
   * Read trends from Google Sheet
   * @returns {Promise<Array>}
   */
  async readTrends() {
    try {
      const range = 'Trends!A2:E'; // Skip header
      const url = `${this.API_BASE}/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const rows = data.values || [];

      return rows.map(row => ({
        month: row[0],
        total: parseFloat(row[1]) || 0,
        subscriptionCount: parseInt(row[2]) || 0,
        currency: row[3] || 'USD',
        lastModified: row[4] || new Date().toISOString()
      }));
    } catch (err) {
      console.error('Failed to read trends:', err);
      return [];
    }
  },

  /**
   * Append subscription to Google Sheet
   * @param {Object} subscription
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async appendSubscription(subscription) {
    try {
      const values = [[
        subscription.id,
        subscription.name,
        subscription.price,
        subscription.currency,
        subscription.cycle,
        subscription.category,
        subscription.startDate || '',
        subscription.notificationsEnabled ? 'true' : 'false',
        subscription.reminderDays || 7,
        subscription.url || '',
        subscription.color || 'purple',
        subscription.lastModified || new Date().toISOString()
      ]];

      const url = `${this.API_BASE}/${this.spreadsheetId}/values/Subscriptions!A:L:append?valueInputOption=USER_ENTERED&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return { success: true };
    } catch (err) {
      console.error('Failed to append subscription:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Update subscription in Google Sheet (by ID)
   * @param {Object} subscription
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateSubscription(subscription) {
    try {
      // Read all to find matching ID
      const all = await this.readSubscriptions();
      const index = all.findIndex(s => s.id === subscription.id);

      if (index === -1) {
        return await this.appendSubscription(subscription);
      }

      // Update specific row (2-indexed because of header)
      const rowNum = index + 2;
      const values = [[
        subscription.id,
        subscription.name,
        subscription.price,
        subscription.currency,
        subscription.cycle,
        subscription.category,
        subscription.startDate || '',
        subscription.notificationsEnabled ? 'true' : 'false',
        subscription.reminderDays || 7,
        subscription.url || '',
        subscription.color || 'purple',
        subscription.lastModified || new Date().toISOString()
      ]];

      const range = `Subscriptions!A${rowNum}:L${rowNum}`;
      const url = `${this.API_BASE}/${this.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return { success: true };
    } catch (err) {
      console.error('Failed to update subscription:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete subscription from Google Sheet (by ID)
   * @param {string} subscriptionId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteSubscription(subscriptionId) {
    try {
      const all = await this.readSubscriptions();
      const index = all.findIndex(s => s.id === subscriptionId);

      if (index === -1) {
        return { success: false, error: 'Subscription not found' };
      }

      // Mark as deleted (soft delete) instead of removing row
      // This preserves row numbers for other operations
      const rowNum = index + 2;
      const range = `Subscriptions!A${rowNum}:L${rowNum}`;
      const values = [['[DELETED]', '', '', '', '', '', '', '', '', '', '', new Date().toISOString()]];

      const url = `${this.API_BASE}/${this.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return { success: true };
    } catch (err) {
      console.error('Failed to delete subscription:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Update budget in Google Sheet
   * @param {Object} budget - {amount, currency, lastModified}
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateBudget(budget) {
    try {
      const values = [[
        budget.amount,
        budget.currency,
        budget.lastModified || new Date().toISOString()
      ]];

      const url = `${this.API_BASE}/${this.spreadsheetId}/values/Budget!A2:C2?valueInputOption=USER_ENTERED&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return { success: true };
    } catch (err) {
      console.error('Failed to update budget:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Append trend snapshot to Google Sheet
   * @param {Object} snapshot - {month, total, subscriptionCount, currency, lastModified}
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async appendTrend(snapshot) {
    try {
      const values = [[
        snapshot.month,
        snapshot.total,
        snapshot.subscriptionCount,
        snapshot.currency,
        snapshot.lastModified || new Date().toISOString()
      ]];

      const url = `${this.API_BASE}/${this.spreadsheetId}/values/Trends!A:E:append?valueInputOption=USER_ENTERED&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return { success: true };
    } catch (err) {
      console.error('Failed to append trend:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Batch sync all data to Google Sheets
   * @param {Object} changes - {subscriptions, budget, trends}
   * @returns {Promise<{success: boolean, syncedAt: string, error?: string}>}
   */
  async batchSync(changes) {
    try {
      const timestamp = new Date().toISOString();
      let syncedCount = 0;

      // Sync subscriptions
      if (changes.subscriptions && changes.subscriptions.length > 0) {
        for (const sub of changes.subscriptions) {
          const result = await this.updateSubscription(sub);
          if (result.success) syncedCount++;
        }
      }

      // Sync budget
      if (changes.budget) {
        const result = await this.updateBudget(changes.budget);
        if (result.success) syncedCount++;
      }

      // Sync trends
      if (changes.trends && changes.trends.length > 0) {
        for (const trend of changes.trends) {
          const result = await this.appendTrend(trend);
          if (result.success) syncedCount++;
        }
      }

      return {
        success: true,
        syncedAt: timestamp,
        itemsCount: syncedCount
      };
    } catch (err) {
      console.error('Failed batch sync:', err);
      return { success: false, error: err.message, syncedAt: null };
    }
  },

  /**
   * Check if currently connected
   * @returns {boolean}
   */
  isConnected() {
    return !!(this.spreadsheetId && this.apiKey);
  }
};
