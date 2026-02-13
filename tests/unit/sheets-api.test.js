// Tests for Google Sheets Public CSV Reader (no API key)
const fs = require('fs');
const path = require('path');

// Mock fetch before loading module
global.fetch = jest.fn();

// Load sheets-api module
let sheetsCode = fs.readFileSync(path.join(__dirname, '../../js/sheets-api.js'), 'utf8');
sheetsCode = sheetsCode.replace('const SheetsAPI = {', 'SheetsAPI = {');
eval(sheetsCode);

if (typeof SheetsAPI === 'undefined') {
  throw new Error('SheetsAPI failed to load');
}

describe('SheetsAPI - Google Sheets Public CSV Reader', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    SheetsAPI.spreadsheetId = null;
    SheetsAPI.sheetsUrl = null;
  });

  describe('extractSpreadsheetId', () => {
    test('SA-1: Should extract spreadsheet ID from valid URL', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1abc2DEF_xyz/edit#gid=0';
      const id = SheetsAPI.extractSpreadsheetId(url);
      expect(id).toBe('1abc2DEF_xyz');
    });

    test('SA-2: Should return null for invalid URL', () => {
      const id = SheetsAPI.extractSpreadsheetId('https://example.com/not-a-sheet');
      expect(id).toBeNull();
    });
  });

  describe('parseCSV', () => {
    test('SA-3: Should parse simple CSV text', () => {
      const csv = 'Name,Price,Currency\nNetflix,15.99,USD\nSpotify,9.99,USD';
      const rows = SheetsAPI.parseCSV(csv);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual(['Name', 'Price', 'Currency']);
      expect(rows[1]).toEqual(['Netflix', '15.99', 'USD']);
    });

    test('SA-4: Should handle quoted fields with commas', () => {
      const csv = '"Name, Full",Price\n"Netflix, Premium",15.99';
      const rows = SheetsAPI.parseCSV(csv);
      expect(rows[1][0]).toBe('Netflix, Premium');
    });

    test('SA-5: Should handle empty input', () => {
      const rows = SheetsAPI.parseCSV('');
      expect(rows).toEqual([]);
    });
  });

  describe('setCredentials', () => {
    test('SA-6: Should store valid URL in localStorage (no API key)', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, text: async () => '"A1"' });

      const result = await SheetsAPI.setCredentials(
        'https://docs.google.com/spreadsheets/d/test123/edit'
      );

      expect(result.success).toBe(true);
      const stored = JSON.parse(localStorage.getItem('_sheets_config'));
      expect(stored.spreadsheetId).toBe('test123');
      expect(stored.apiKey).toBeUndefined();
    });

    test('SA-7: Should reject invalid Sheet URL', async () => {
      const result = await SheetsAPI.setCredentials('https://example.com/not-sheets');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('SA-8: Should reject when sheet is not publicly accessible', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });

      const result = await SheetsAPI.setCredentials(
        'https://docs.google.com/spreadsheets/d/test123/edit'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('not accessible');
    });
  });

  describe('getCredentials', () => {
    test('SA-9: Should return null when no connection stored', () => {
      const creds = SheetsAPI.getCredentials();
      expect(creds).toBeNull();
    });

    test('SA-10: Should return stored connection (no apiKey)', () => {
      localStorage.setItem('_sheets_config', JSON.stringify({
        spreadsheetId: 'abc123',
        sheetsUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit'
      }));

      const creds = SheetsAPI.getCredentials();
      expect(creds.spreadsheetId).toBe('abc123');
      expect(creds.sheetsUrl).toContain('abc123');
      expect(creds.apiKey).toBeUndefined();
    });
  });

  describe('clearCredentials', () => {
    test('SA-11: Should remove all stored connection data', () => {
      localStorage.setItem('_sheets_config', JSON.stringify({
        spreadsheetId: 'abc', sheetsUrl: 'url'
      }));

      SheetsAPI.clearCredentials();
      expect(localStorage.getItem('_sheets_config')).toBeNull();
      expect(SheetsAPI.spreadsheetId).toBeNull();
    });
  });

  describe('isConnected', () => {
    test('SA-12: Should return false when no spreadsheetId', () => {
      expect(SheetsAPI.isConnected()).toBe(false);
    });

    test('SA-13: Should return true when spreadsheetId is set (no apiKey needed)', () => {
      SheetsAPI.spreadsheetId = 'test123';
      expect(SheetsAPI.isConnected()).toBe(true);
    });
  });

  describe('readSubscriptions', () => {
    test('SA-14: Should parse CSV response into subscription objects', async () => {
      SheetsAPI.spreadsheetId = 'test123';

      const csvData = 'ID,Name,Price,Currency,Cycle,Category,StartDate,Notifications,ReminderDays,URL,Color,LastModified\n' +
        'id1,Netflix,15.99,USD,Monthly,entertainment,2025-01-01,true,7,netflix.com,red,2025-01-01T00:00:00Z';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => csvData
      });

      const subs = await SheetsAPI.readSubscriptions();
      expect(subs.length).toBe(1);
      expect(subs[0].name).toBe('Netflix');
      expect(subs[0].price).toBe(15.99);
      expect(subs[0].category).toBe('entertainment');
      expect(subs[0].notificationsEnabled).toBe(true);
    });

    test('SA-15: Should return empty array on fetch error', async () => {
      SheetsAPI.spreadsheetId = 'test123';

      global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const subs = await SheetsAPI.readSubscriptions();
      expect(subs).toEqual([]);
    });
  });

  describe('readBudget', () => {
    test('SA-16: Should parse budget from CSV response', async () => {
      SheetsAPI.spreadsheetId = 'test123';

      const csvData = 'Amount,Currency,LastModified\n500,EUR,2025-06-01T00:00:00Z';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => csvData
      });

      const budget = await SheetsAPI.readBudget();
      expect(budget.amount).toBe(500);
      expect(budget.currency).toBe('EUR');
    });

    test('SA-17: Should return null when no budget data', async () => {
      SheetsAPI.spreadsheetId = 'test123';

      const csvData = 'Amount,Currency,LastModified';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => csvData
      });

      const budget = await SheetsAPI.readBudget();
      expect(budget).toBeNull();
    });
  });
});
