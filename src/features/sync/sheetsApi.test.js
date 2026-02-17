import {
  extractSpreadsheetId,
  parseSheetCSV,
  fetchSheet,
  setCredentials,
  getCredentials,
  clearCredentials,
  isConnected,
  readSubscriptions,
  readBudget,
  readTrends,
  readFinancialRecords,
} from './sheetsApi';

describe('Sheets API', () => {
  // --- extractSpreadsheetId ---

  // SA-1
  it('extracts ID from valid Google Sheets URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/abc123XYZ_-/edit';
    expect(extractSpreadsheetId(url)).toBe('abc123XYZ_-');
  });

  // SA-2
  it('returns null for invalid URL without spreadsheets path', () => {
    expect(extractSpreadsheetId('https://example.com')).toBeNull();
  });

  // SA-3
  it('returns null for empty string', () => {
    expect(extractSpreadsheetId('')).toBeNull();
  });

  // SA-4
  it('handles URL with extra path segments', () => {
    const url = 'https://docs.google.com/spreadsheets/d/myId123/edit#gid=0';
    expect(extractSpreadsheetId(url)).toBe('myId123');
  });

  // --- parseSheetCSV ---

  // SA-5
  it('parses simple CSV into 2D array', () => {
    const csv = 'a,b,c\n1,2,3';
    const result = parseSheetCSV(csv);
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  // SA-6
  it('handles quoted fields with commas', () => {
    const csv = '"hello, world",b';
    const result = parseSheetCSV(csv);
    expect(result).toEqual([['hello, world', 'b']]);
  });

  // SA-7
  it('handles escaped quotes (doubled quotes)', () => {
    const csv = '"""quoted"""';
    const result = parseSheetCSV(csv);
    // The parser sees: " -> toggle inQuotes, " followed by " -> literal quote, q-u-o-t-e-d, " followed by " -> literal quote, " -> toggle inQuotes
    expect(result[0][0]).toBe('"quoted"');
  });

  // SA-8
  it('skips empty rows', () => {
    const csv = 'a,b\n\nc,d';
    const result = parseSheetCSV(csv);
    expect(result).toEqual([['a', 'b'], ['c', 'd']]);
  });

  // SA-9
  it('handles carriage returns in CSV', () => {
    const csv = 'a,b\r\n1,2';
    const result = parseSheetCSV(csv);
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  // --- Credentials management ---

  // SA-10
  it('getCredentials returns null when not set', () => {
    expect(getCredentials()).toBeNull();
  });

  // SA-11
  describe('credentials round-trip', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('setCredentials stores and getCredentials retrieves', async () => {
      global.fetch.mockResolvedValue({ ok: true, text: async () => 'ok' });

      const url = 'https://docs.google.com/spreadsheets/d/testId123/edit';
      const result = await setCredentials(url);

      expect(result.success).toBe(true);

      const creds = getCredentials();
      expect(creds).not.toBeNull();
      expect(creds.spreadsheetId).toBe('testId123');
      expect(creds.sheetsUrl).toBe(url);
      expect(creds.connectedAt).toBeDefined();
    });
  });

  // SA-12
  it('clearCredentials removes stored credentials', () => {
    localStorage.setItem('_sheets_config', JSON.stringify({ spreadsheetId: 'x' }));
    expect(getCredentials()).not.toBeNull();
    clearCredentials();
    expect(getCredentials()).toBeNull();
  });

  // SA-13
  it('isConnected returns false when no credentials', () => {
    expect(isConnected()).toBe(false);
  });

  // SA-14
  it('isConnected returns true when credentials stored', () => {
    localStorage.setItem('_sheets_config', JSON.stringify({ spreadsheetId: 'x' }));
    expect(isConnected()).toBe(true);
  });

  // SA-15
  describe('setCredentials with invalid URL', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('rejects invalid URL', async () => {
      const result = await setCredentials('https://example.com/not-a-sheet');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid Google Sheets URL');
    });
  });

  // --- fetchSheet URL behavior ---

  describe('fetchSheet', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // SA-16
    it('uses sheet query param for named tab targets', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'a,b\n1,2',
      });

      await fetchSheet('fakeId', 'Sheet1');
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('sheet=Sheet1');
      expect(calledUrl).not.toContain('&gid=');
    });

    // SA-17
    it('uses gid query param for gid targets', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => 'a,b\n1,2',
      });

      await fetchSheet('fakeId', 'gid:423540830');
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain('gid=423540830');
      expect(calledUrl).not.toContain('&sheet=');
    });
  });

  // --- readSubscriptions ---

  describe('readSubscriptions', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // SA-18
    it('parses CSV into subscription objects', async () => {
      const csvText =
        '"id","name","price","currency","cycle","category","startDate","notificationsEnabled","reminderDays","url","color","lastModified"\n' +
        '"sub1","Netflix","15.99","USD","Monthly","entertainment","2024-01-01","true","7","","purple","2024-01-01T00:00:00.000Z"';

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => csvText,
      });

      const subs = await readSubscriptions('fakeId');
      expect(subs).toHaveLength(1);
      expect(subs[0].id).toBe('sub1');
      expect(subs[0].name).toBe('Netflix');
      expect(subs[0].price).toBe(15.99);
      expect(subs[0].currency).toBe('USD');
      expect(subs[0].cycle).toBe('Monthly');
      expect(subs[0].category).toBe('entertainment');
      expect(subs[0].notificationsEnabled).toBe(true);
      expect(subs[0].reminderDays).toBe(7);
      expect(subs[0].color).toBe('purple');
    });
  });

  // --- readBudget ---

  describe('readBudget', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // SA-19
    it('parses budget row from CSV', async () => {
      const csvText = '"amount","currency","lastModified"\n"100.50","EUR","2024-06-01T00:00:00.000Z"';

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => csvText,
      });

      const budget = await readBudget('fakeId');
      expect(budget).not.toBeNull();
      expect(budget.amount).toBe(100.5);
      expect(budget.currency).toBe('EUR');
      expect(budget.lastModified).toBe('2024-06-01T00:00:00.000Z');
    });
  });

  // --- readFinancialRecords ---

  describe('readFinancialRecords', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    // SA-20
    it('maps income and expenses from header names even when title row exists', async () => {
      const csvText = [
        '"My Finance Tracker"',
        '"Date","Description","Income","Expenses","Type"',
        '"2026-02-01","Salary","5,000","0","Income"',
        '"2026-02-02","Rent","0","1,250","Utility"',
      ].join('\n');

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => csvText,
      });

      const records = await readFinancialRecords('fakeId', 'Sheet1');
      expect(records).toHaveLength(2);
      expect(records[0].income).toBe(5000);
      expect(records[0].expenses).toBe(0);
      expect(records[1].income).toBe(0);
      expect(records[1].expenses).toBe(1250);
    });

    // SA-21
    it('supports common misspelling variants for Income/Expenses column headers', async () => {
      const csvText = [
        '"Date","Description","Income Collumn","Expenses Collumn"',
        '"2026-03-01","Consulting","1200","0"',
        '"2026-03-02","Groceries","0","320"',
      ].join('\n');

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => csvText,
      });

      const records = await readFinancialRecords('fakeId', 'Sheet1');
      expect(records).toHaveLength(2);
      expect(records[0].income).toBe(1200);
      expect(records[0].expenses).toBe(0);
      expect(records[1].income).toBe(0);
      expect(records[1].expenses).toBe(320);
    });

    // SA-22
    it('normalizes date and due date values to yyyy-mm-dd for date inputs', async () => {
      const csvText = [
        '"Date","Description","Due Date","Income","Expenses","Type"',
        '"17/02/2026","UOB Cash","28/02/2026","0","1200","Credit Card"',
      ].join('\n');

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => csvText,
      });

      const records = await readFinancialRecords('fakeId', 'Sheet1');
      expect(records).toHaveLength(1);
      expect(records[0].date).toBe('2026-02-17');
      expect(records[0].dueDate).toBe('2026-02-28');
    });

    // SA-23
    it('supports month-first date format and still outputs yyyy-mm-dd', async () => {
      const csvText = [
        '"Date","Description","Due Date","Income","Expenses","Type"',
        '"2/17/2026","Salary","2/28/2026","5000","0","Income"',
      ].join('\n');

      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => csvText,
      });

      const records = await readFinancialRecords('fakeId', 'Sheet1');
      expect(records).toHaveLength(1);
      expect(records[0].date).toBe('2026-02-17');
      expect(records[0].dueDate).toBe('2026-02-28');
    });
  });
});
