/**
 * Google Sheets Public CSV Reader
 * Reads data from publicly-shared Google Sheets without API key
 */

const SHEETS_CONFIG_KEY = '_sheets_config';

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(sheetsUrl) {
  try {
    const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch (err) {
    console.warn('Failed to extract spreadsheet ID:', err);
    return null;
  }
}

/**
 * Parse CSV text into 2D array
 * Handles quoted fields with commas and newlines
 */
export function parseSheetCSV(text) {
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
  row.push(current.trim());
  if (row.some(cell => cell !== '')) {
    rows.push(row);
  }

  return rows;
}

/**
 * Fetch a sheet tab as CSV from a public Google Sheet
 */
export async function fetchSheet(spreadsheetId, sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return parseSheetCSV(text);
}

/**
 * Set and validate connection (URL only, no API key)
 */
export async function setCredentials(sheetUrl) {
  try {
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      return { success: false, error: 'Invalid Google Sheets URL' };
    }

    // Test access
    const testUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&range=A1`;
    const response = await fetch(testUrl);

    if (!response.ok) {
      return { success: false, error: 'Sheet not accessible. Make sure it is shared publicly (Anyone with the link).' };
    }

    localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify({
      spreadsheetId,
      sheetsUrl: sheetUrl,
      connectedAt: new Date().toISOString()
    }));

    return { success: true };
  } catch (err) {
    console.error('Failed to connect to sheet:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get stored connection info
 */
export function getCredentials() {
  try {
    const stored = localStorage.getItem(SHEETS_CONFIG_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (err) {
    console.warn('Failed to retrieve connection:', err);
    return null;
  }
}

/**
 * Clear connection
 */
export function clearCredentials() {
  localStorage.removeItem(SHEETS_CONFIG_KEY);
}

/**
 * Check if currently connected
 */
export function isConnected() {
  return !!getCredentials();
}

/**
 * Read subscriptions from Google Sheet
 */
export async function readSubscriptions(spreadsheetId) {
  const rows = await fetchSheet(spreadsheetId, 'Subscriptions');
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
}

/**
 * Read budget from Google Sheet
 */
export async function readBudget(spreadsheetId) {
  const rows = await fetchSheet(spreadsheetId, 'Budget');
  const row = rows[1];

  if (!row) return null;

  return {
    amount: parseFloat(row[0]) || 0,
    currency: row[1] || 'USD',
    lastModified: row[2] || new Date().toISOString()
  };
}

/**
 * Read trends from Google Sheet
 */
export async function readTrends(spreadsheetId) {
  const rows = await fetchSheet(spreadsheetId, 'Trends');
  const dataRows = rows.slice(1);

  return dataRows.map(row => ({
    month: row[0] || '',
    total: parseFloat(row[1]) || 0,
    subscriptionCount: parseInt(row[2]) || 0,
    currency: row[3] || 'USD',
    lastModified: row[4] || new Date().toISOString()
  }));
}

/**
 * Read financial records from Google Sheet using header row for column mapping
 */
export async function readFinancialRecords(spreadsheetId, sheetTab = 'Sheet1') {
  const rows = await fetchSheet(spreadsheetId, sheetTab);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => (h || '').toString().trim().toLowerCase());
  const col = (name) => headers.indexOf(name);

  const dataRows = rows.slice(1);

  return dataRows.map((row, i) => {
    const get = (name) => (col(name) >= 0 ? row[col(name)] : '') || '';
    const getNum = (name) => parseFloat(get(name)) || 0;

    return {
      id: `sheet_${i}_${Date.now()}`,
      date: get('date'),
      description: get('description'),
      interestRate: getNum('interest rate') || getNum('interestrate') || getNum('interest rate (%)'),
      income: getNum('income'),
      expenses: getNum('expenses'),
      minimumExpenses: getNum('minimum expenses') || getNum('minimumexpenses') || getNum('min expenses'),
      balance: getNum('balance'),
      dueDate: get('due date') || get('duedate'),
      paymentMethod: get('payment method') || get('paymentmethod'),
      howPaid: get('how paid') || get('howpaid') || get('how i paid?'),
      done: ['true', 'yes'].includes(get('done').toLowerCase()),
      type: get('type'),
      note: get('note') || get('notes'),
      lastModified: new Date().toISOString(),
    };
  }).filter(r => r.date && r.description);
}
