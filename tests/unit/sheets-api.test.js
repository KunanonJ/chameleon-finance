// Tests for Google Sheets API Wrapper
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

describe('SheetsAPI - Google Sheets Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    SheetsAPI.spreadsheetId = null;
    SheetsAPI.apiKey = null;
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

  describe('setCredentials', () => {
    test('SA-3: Should store valid credentials in localStorage', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true });

      const result = await SheetsAPI.setCredentials(
        'https://docs.google.com/spreadsheets/d/test123/edit',
        'AIzaTestKey'
      );

      expect(result.success).toBe(true);
      const stored = JSON.parse(localStorage.getItem('_sheets_config'));
      expect(stored.spreadsheetId).toBe('test123');
      expect(stored.apiKey).toBe('AIzaTestKey');
    });

    test('SA-4: Should reject invalid Sheet URL', async () => {
      const result = await SheetsAPI.setCredentials(
        'https://example.com/not-sheets',
        'AIzaTestKey'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('SA-5: Should reject when API returns error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });

      const result = await SheetsAPI.setCredentials(
        'https://docs.google.com/spreadsheets/d/test123/edit',
        'BadKey'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API Key');
    });
  });

  describe('getCredentials', () => {
    test('SA-6: Should return null when no credentials stored', () => {
      const creds = SheetsAPI.getCredentials();
      expect(creds).toBeNull();
    });

    test('SA-7: Should return stored credentials', () => {
      localStorage.setItem('_sheets_config', JSON.stringify({
        spreadsheetId: 'abc123',
        apiKey: 'testkey',
        sheetsUrl: 'https://docs.google.com/spreadsheets/d/abc123/edit'
      }));

      const creds = SheetsAPI.getCredentials();
      expect(creds.spreadsheetId).toBe('abc123');
      expect(creds.apiKey).toBe('testkey');
    });
  });

  describe('clearCredentials', () => {
    test('SA-8: Should remove all stored credentials', () => {
      localStorage.setItem('_sheets_config', JSON.stringify({
        spreadsheetId: 'abc', apiKey: 'key', sheetsUrl: 'url'
      }));

      SheetsAPI.clearCredentials();
      expect(localStorage.getItem('_sheets_config')).toBeNull();
      expect(SheetsAPI.spreadsheetId).toBeNull();
      expect(SheetsAPI.apiKey).toBeNull();
    });
  });

  describe('isConnected', () => {
    test('SA-9: Should return false when no credentials', () => {
      expect(SheetsAPI.isConnected()).toBe(false);
    });

    test('SA-10: Should return true when credentials are set', () => {
      SheetsAPI.spreadsheetId = 'test123';
      SheetsAPI.apiKey = 'testkey';
      expect(SheetsAPI.isConnected()).toBe(true);
    });
  });

  describe('readSubscriptions', () => {
    test('SA-11: Should parse API response into subscription objects', async () => {
      SheetsAPI.spreadsheetId = 'test123';
      SheetsAPI.apiKey = 'testkey';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          values: [
            ['id1', 'Netflix', '15.99', 'USD', 'Monthly', 'entertainment', '2025-01-01', 'true', '7', 'netflix.com', 'red', '2025-01-01T00:00:00Z']
          ]
        })
      });

      const subs = await SheetsAPI.readSubscriptions();
      expect(subs.length).toBe(1);
      expect(subs[0].name).toBe('Netflix');
      expect(subs[0].price).toBe(15.99);
      expect(subs[0].category).toBe('entertainment');
      expect(subs[0].notificationsEnabled).toBe(true);
    });

    test('SA-12: Should return empty array on API error', async () => {
      SheetsAPI.spreadsheetId = 'test123';
      SheetsAPI.apiKey = 'testkey';

      global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const subs = await SheetsAPI.readSubscriptions();
      expect(subs).toEqual([]);
    });
  });

  describe('readBudget', () => {
    test('SA-13: Should parse budget from API response', async () => {
      SheetsAPI.spreadsheetId = 'test123';
      SheetsAPI.apiKey = 'testkey';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          values: [['500', 'EUR', '2025-06-01T00:00:00Z']]
        })
      });

      const budget = await SheetsAPI.readBudget();
      expect(budget.amount).toBe(500);
      expect(budget.currency).toBe('EUR');
    });

    test('SA-14: Should return null when no budget data', async () => {
      SheetsAPI.spreadsheetId = 'test123';
      SheetsAPI.apiKey = 'testkey';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: undefined })
      });

      const budget = await SheetsAPI.readBudget();
      expect(budget).toBeNull();
    });
  });

  describe('batchSync', () => {
    test('SA-15: Should sync subscriptions and budget', async () => {
      SheetsAPI.spreadsheetId = 'test123';
      SheetsAPI.apiKey = 'testkey';

      // Mock readSubscriptions (for updateSubscription finding existing)
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ values: [] }) // read subs (empty)
        })
        .mockResolvedValueOnce({ ok: true }) // append sub
        .mockResolvedValueOnce({ ok: true }); // update budget

      const result = await SheetsAPI.batchSync({
        subscriptions: [{ id: 'new1', name: 'Test', price: 10, currency: 'USD' }],
        budget: { amount: 100, currency: 'USD' },
        trends: []
      });

      expect(result.success).toBe(true);
      expect(result.syncedAt).toBeTruthy();
      expect(result.itemsCount).toBeGreaterThan(0);
    });
  });
});
