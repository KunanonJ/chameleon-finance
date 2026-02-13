// Google Sheets Public CSV Reader
// Reads data from publicly-shared Google Sheets without API key

const SheetsAPI = {
  // Configuration
  spreadsheetId: null,
  sheetsUrl: null,

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
   * Parse CSV text into 2D array
   * Handles quoted fields with commas and newlines
   * @param {string} text - CSV text
   * @returns {Array<Array<string>>}
   */
  parseCSV(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let row = [];

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' && !inQuotes) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) {
          rows.push(row);
        }
        row = [];
        current = '';
      } else if (ch === '\r') {
        // skip carriage return
      } else {
        current += ch;
      }
    }
    // Last row
    row.push(current.trim());
    if (row.some(cell => cell !== '')) {
      rows.push(row);
    }

    return rows;
  },

  /**
   * Fetch a sheet tab as CSV from a public Google Sheet
   * @param {string} sheetName - Tab name (e.g. "Subscriptions")
   * @returns {Promise<Array<Array<string>>>} - Parsed CSV rows
   */
  async fetchSheet(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return this.parseCSV(text);
  },

  /**
   * Set and validate connection (URL only, no API key)
   * @param {string} sheetUrl - Google Sheet URL (must be publicly shared)
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setCredentials(sheetUrl) {
    try {
      this.spreadsheetId = this.extractSpreadsheetId(sheetUrl);
      if (!this.spreadsheetId) {
        return { success: false, error: 'Invalid Google Sheets URL' };
      }

      this.sheetsUrl = sheetUrl;

      // Test access by fetching the first sheet as CSV
      const testUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv&range=A1`;
      const response = await fetch(testUrl);

      if (!response.ok) {
        return { success: false, error: 'Sheet not accessible. Make sure it is shared publicly (Anyone with the link).' };
      }

      // Store connection in localStorage
      localStorage.setItem('_sheets_config', JSON.stringify({
        spreadsheetId: this.spreadsheetId,
        sheetsUrl: this.sheetsUrl,
        connectedAt: new Date().toISOString()
      }));

      return { success: true };
    } catch (err) {
      console.error('Failed to connect to sheet:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Get stored connection info
   * @returns {{spreadsheetId: string, sheetsUrl: string}|null}
   */
  getCredentials() {
    try {
      const stored = localStorage.getItem('_sheets_config');
      if (!stored) return null;

      const config = JSON.parse(stored);
      this.spreadsheetId = config.spreadsheetId;
      this.sheetsUrl = config.sheetsUrl;

      return config;
    } catch (err) {
      console.warn('Failed to retrieve connection:', err);
      return null;
    }
  },

  /**
   * Clear connection
   */
  clearCredentials() {
    this.spreadsheetId = null;
    this.sheetsUrl = null;
    localStorage.removeItem('_sheets_config');
  },

  /**
   * Read subscriptions from Google Sheet
   * Expects sheet tab named "Subscriptions" with header row
   * @returns {Promise<Array>}
   */
  async readSubscriptions() {
    try {
      const rows = await this.fetchSheet('Subscriptions');
      // Skip header row (row 0)
      const dataRows = rows.slice(1);

      return dataRows.map(row => ({
        id: row[0] || '',
        name: row[1] || '',
        price: parseFloat(row[2]) || 0,
        currency: row[3] || 'USD',
        cycle: row[4] || 'Monthly',
        category: row[5] || 'other',
        startDate: row[6] || '',
        notificationsEnabled: row[7] === 'true' || row[7] === 'TRUE',
        reminderDays: parseInt(row[8]) || 7,
        url: row[9] || '',
        color: row[10] || 'purple',
        lastModified: row[11] || new Date().toISOString()
      })).filter(s => s.id && s.id !== '[DELETED]');
    } catch (err) {
      console.error('Failed to read subscriptions:', err);
      return [];
    }
  },

  /**
   * Read budget from Google Sheet
   * Expects sheet tab named "Budget" with header row
   * @returns {Promise<{amount: number, currency: string, lastModified: string}|null>}
   */
  async readBudget() {
    try {
      const rows = await this.fetchSheet('Budget');
      const row = rows[1]; // Skip header

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
   * Expects sheet tab named "Trends" with header row
   * @returns {Promise<Array>}
   */
  async readTrends() {
    try {
      const rows = await this.fetchSheet('Trends');
      const dataRows = rows.slice(1); // Skip header

      return dataRows.map(row => ({
        month: row[0] || '',
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
   * Check if currently connected
   * @returns {boolean}
   */
  isConnected() {
    return !!this.spreadsheetId;
  }
};
