/**
 * Google Sheets Public CSV Reader
 * Reads data from publicly-shared Google Sheets without API key
 */

const SHEETS_CONFIG_KEY = "_sheets_config";

/**
 * Extract spreadsheet ID from Google Sheets URL
 */
export function extractSpreadsheetId(sheetsUrl) {
  try {
    const match = sheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch (err) {
    console.warn("Failed to extract spreadsheet ID:", err);
    return null;
  }
}

/**
 * Parse CSV text into 2D array
 * Handles quoted fields with commas and newlines
 */
export function parseSheetCSV(text) {
  const rows = [];
  let current = "";
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
    } else if (ch === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if (ch === "\n" && !inQuotes) {
      row.push(current.trim());
      if (row.some((cell) => cell !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
    } else if (ch === "\r") {
      // skip carriage return
    } else {
      current += ch;
    }
  }
  row.push(current.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
}

/**
 * Fetch a sheet tab as CSV from a public Google Sheet
 */
export async function fetchSheet(spreadsheetId, sheetName) {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
  const isGidTarget =
    typeof sheetName === "string" && sheetName.startsWith("gid:");
  const url = isGidTarget
    ? `${base}&gid=${encodeURIComponent(sheetName.slice(4))}`
    : `${base}&sheet=${encodeURIComponent(sheetName)}`;
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
      return { success: false, error: "Invalid Google Sheets URL" };
    }

    // Test access
    const testUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&range=A1`;
    const response = await fetch(testUrl);

    if (!response.ok) {
      return {
        success: false,
        error:
          "Sheet not accessible. Make sure it is shared publicly (Anyone with the link).",
      };
    }

    localStorage.setItem(
      SHEETS_CONFIG_KEY,
      JSON.stringify({
        spreadsheetId,
        sheetsUrl: sheetUrl,
        connectedAt: new Date().toISOString(),
      }),
    );

    return { success: true };
  } catch (err) {
    console.error("Failed to connect to sheet:", err);
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
    console.warn("Failed to retrieve connection:", err);
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
  const rows = await fetchSheet(spreadsheetId, "Subscriptions");
  const dataRows = rows.slice(1);

  return dataRows
    .map((row) => ({
      id: row[0] || "",
      name: row[1] || "",
      price: parseFloat(row[2]) || 0,
      currency: row[3] || "USD",
      cycle: row[4] || "Monthly",
      category: row[5] || "other",
      startDate: row[6] || "",
      notificationsEnabled: row[7] === "true" || row[7] === "TRUE",
      reminderDays: parseInt(row[8]) || 7,
      url: row[9] || "",
      color: row[10] || "purple",
      lastModified: row[11] || new Date().toISOString(),
    }))
    .filter((s) => s.id && s.id !== "[DELETED]");
}

/**
 * Read budget from Google Sheet
 */
export async function readBudget(spreadsheetId) {
  const rows = await fetchSheet(spreadsheetId, "Budget");
  const row = rows[1];

  if (!row) return null;

  return {
    amount: parseFloat(row[0]) || 0,
    currency: row[1] || "USD",
    lastModified: row[2] || new Date().toISOString(),
  };
}

/**
 * Read trends from Google Sheet
 */
export async function readTrends(spreadsheetId) {
  const rows = await fetchSheet(spreadsheetId, "Trends");
  const dataRows = rows.slice(1);

  return dataRows.map((row) => ({
    month: row[0] || "",
    total: parseFloat(row[1]) || 0,
    subscriptionCount: parseInt(row[2]) || 0,
    currency: row[3] || "USD",
    lastModified: row[4] || new Date().toISOString(),
  }));
}

const FINANCE_COLUMN_ALIASES = {
  date: ["date", "transactiondate", "recorddate"],
  description: ["description", "details", "item", "name"],
  interestRate: ["interestrate", "interestedrate", "rate"],
  income: [
    "income",
    "incomes",
    "incomeamount",
    "incomecolumn",
    "incomecollumn",
  ],
  expenses: [
    "expenses",
    "expense",
    "expenseamount",
    "expensescolumn",
    "expensescollumn",
  ],
  minimumExpenses: [
    "minimumexpenses",
    "minexpenses",
    "minimumexpense",
    "minexpense",
  ],
  balance: ["balance", "netbalance", "remainingbalance"],
  dueDate: ["duedate", "due"],
  paymentMethod: ["paymentmethod", "payment"],
  howPaid: ["howpaid", "howipaid", "paidby"],
  done: ["done", "isdone", "completed"],
  type: ["type", "category"],
  note: ["note", "notes", "remark", "remarks"],
};

const FINANCE_FALLBACK_INDEX = {
  date: 0,
  description: 1,
  interestRate: 2,
  income: 3,
  expenses: 4,
  minimumExpenses: 5,
  balance: 6,
  dueDate: 7,
  paymentMethod: 8,
  howPaid: 9,
  done: 10,
  type: 11,
  note: 12,
};

function normalizeHeader(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9]+/g, "");
}

function parseSheetNumber(value) {
  const raw = (value || "").toString().trim();
  if (!raw) return 0;

  const negative = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw.replace(/[^\d.,-]/g, "");
  if (!cleaned) return 0;

  let normalized = cleaned;
  const hasDot = cleaned.includes(".");
  const hasComma = cleaned.includes(",");

  if (hasDot && hasComma) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (hasComma) {
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = `${parts[0].replace(/\./g, "")}.${parts[1]}`;
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  }

  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return negative ? -Math.abs(parsed) : parsed;
}

function parseSheetBoolean(value) {
  const normalized = (value || "").toString().trim().toLowerCase();
  return ["true", "yes", "y", "1", "done", "paid"].includes(normalized);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseSheetDate(value) {
  const raw = (value || "").toString().trim();
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const ymd = raw.match(/^(\d{4})[/. -](\d{1,2})[/. -](\d{1,2})$/);
  if (ymd) {
    const year = Number.parseInt(ymd[1], 10);
    const month = Number.parseInt(ymd[2], 10);
    const day = Number.parseInt(ymd[3], 10);
    return toIsoDate(year, month, day);
  }

  const dmyOrMdy = raw.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/);
  if (dmyOrMdy) {
    const part1 = Number.parseInt(dmyOrMdy[1], 10);
    const part2 = Number.parseInt(dmyOrMdy[2], 10);
    const yearRaw = Number.parseInt(dmyOrMdy[3], 10);
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;

    let day = part1;
    let month = part2;

    if (part1 <= 12 && part2 > 12) {
      month = part1;
      day = part2;
    } else if (part1 <= 12 && part2 <= 12) {
      // Ambiguous dates default to day/month to match the app's date UX.
      day = part1;
      month = part2;
    }

    return toIsoDate(year, month, day);
  }

  // Google Sheets can output serial dates if cells are not formatted as Date.
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number.parseFloat(raw);
    if (Number.isFinite(serial) && serial > 10_000) {
      const wholeDays = Math.floor(serial);
      const ms = Date.UTC(1899, 11, 30) + wholeDays * 86400000;
      const date = new Date(ms);
      return toIsoDate(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      );
    }
  }

  const fallback = new Date(raw);
  if (Number.isNaN(fallback.getTime())) return "";
  return toIsoDate(
    fallback.getFullYear(),
    fallback.getMonth() + 1,
    fallback.getDate(),
  );
}

function findHeaderRowIndex(rows) {
  let bestIndex = 0;
  let bestScore = -1;
  const maxScanRows = Math.min(rows.length, 6);

  for (let i = 0; i < maxScanRows; i++) {
    const normalizedRow = rows[i].map(normalizeHeader).filter(Boolean);
    if (!normalizedRow.length) continue;

    let score = 0;
    if (
      FINANCE_COLUMN_ALIASES.date.some((alias) => normalizedRow.includes(alias))
    )
      score += 1;
    if (
      FINANCE_COLUMN_ALIASES.description.some((alias) =>
        normalizedRow.includes(alias),
      )
    )
      score += 1;
    if (
      FINANCE_COLUMN_ALIASES.income.some((alias) =>
        normalizedRow.includes(alias),
      )
    )
      score += 1;
    if (
      FINANCE_COLUMN_ALIASES.expenses.some((alias) =>
        normalizedRow.includes(alias),
      )
    )
      score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // Require at least two core columns to treat a row as headers.
  return bestScore >= 2 ? bestIndex : 0;
}

function resolveColumnIndex(normalizedHeaders, key) {
  const aliases = FINANCE_COLUMN_ALIASES[key] || [];

  for (const alias of aliases) {
    const exactIdx = normalizedHeaders.indexOf(alias);
    if (exactIdx !== -1) return exactIdx;
  }

  // Fallback for variants like "income column", "expenses column", etc.
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i];
    if (!header) continue;
    for (const alias of aliases) {
      if (header.includes(alias)) return i;
    }
  }

  return -1;
}

/**
 * Read financial records from Google Sheet using header row for column mapping
 */
export async function readFinancialRecords(spreadsheetId, sheetTab = "Sheet1") {
  const rows = await fetchSheet(spreadsheetId, sheetTab);
  if (rows.length < 2) return [];

  const headerRowIndex = findHeaderRowIndex(rows);
  const normalizedHeaders = (rows[headerRowIndex] || []).map(normalizeHeader);

  const columnIndex = Object.keys(FINANCE_COLUMN_ALIASES).reduce((acc, key) => {
    acc[key] = resolveColumnIndex(normalizedHeaders, key);
    return acc;
  }, {});

  const dataRows = rows.slice(headerRowIndex + 1);
  const importTimestamp = Date.now();

  return dataRows
    .map((row, i) => {
      const getValue = (key) => {
        const mappedIndex = columnIndex[key];
        if (mappedIndex >= 0 && mappedIndex < row.length) {
          return row[mappedIndex] || "";
        }

        const fallbackIndex = FINANCE_FALLBACK_INDEX[key];
        if (typeof fallbackIndex === "number" && fallbackIndex < row.length) {
          return row[fallbackIndex] || "";
        }

        return "";
      };

      return {
        id: `sheet_${i}_${importTimestamp}`,
        date: parseSheetDate(getValue("date")),
        description: getValue("description"),
        interestRate: parseSheetNumber(getValue("interestRate")),
        income: parseSheetNumber(getValue("income")),
        expenses: parseSheetNumber(getValue("expenses")),
        minimumExpenses: parseSheetNumber(getValue("minimumExpenses")),
        balance: parseSheetNumber(getValue("balance")),
        dueDate: parseSheetDate(getValue("dueDate")),
        paymentMethod: getValue("paymentMethod"),
        howPaid: getValue("howPaid"),
        done: parseSheetBoolean(getValue("done")),
        type: getValue("type"),
        note: getValue("note"),
        lastModified: new Date().toISOString(),
      };
    })
    .filter((record) => record.date && record.description);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Try to fetch a sheet tab, returning null if the tab does not exist.
 * Google Sheets CSV endpoint silently falls back to the first tab when a
 * requested tab does not exist, so we detect duplicates by comparing the
 * first data row against a known reference.
 */
async function tryFetchFinanceTab(spreadsheetId, tabName, referenceFirstRow) {
  try {
    const rows = await fetchSheet(spreadsheetId, tabName);
    if (rows.length < 2) return null;

    // When the tab doesn't exist Google returns the first tab's data.
    // Detect this by comparing the first data cell (the Date value).
    if (referenceFirstRow) {
      const headerIdx = findHeaderRowIndex(rows);
      const firstDataRow = rows[headerIdx + 1];
      if (
        firstDataRow &&
        referenceFirstRow.length > 0 &&
        firstDataRow[0] === referenceFirstRow[0] &&
        firstDataRow[1] === referenceFirstRow[1]
      ) {
        return null; // Same as reference → tab doesn't really exist
      }
    }

    return rows;
  } catch {
    return null;
  }
}

/**
 * Read financial records from ALL monthly tabs in the spreadsheet.
 * Tries common monthly tab name patterns and merges results.
 * Falls back to the single-tab reader if no monthly tabs are found.
 */
export async function readAllFinancialRecords(
  spreadsheetId,
  primaryTab = "Sheet1",
) {
  // First, read the primary tab to use as reference for duplicate detection
  let primaryRows;
  try {
    primaryRows = await fetchSheet(spreadsheetId, primaryTab);
  } catch {
    primaryRows = [];
  }

  const primaryHeaderIdx =
    primaryRows.length >= 2 ? findHeaderRowIndex(primaryRows) : 0;
  const referenceFirstRow =
    primaryRows.length > primaryHeaderIdx + 1
      ? primaryRows[primaryHeaderIdx + 1]
      : null;

  // Determine current year for tab name guesses
  const currentYear = new Date().getFullYear();
  const yearsToTry = [currentYear, currentYear - 1, currentYear + 1];

  // Build candidate tab names to probe
  const candidateTabs = new Set();
  for (const year of yearsToTry) {
    for (const month of MONTH_NAMES) {
      candidateTabs.add(`${month} ${year}`); // "January 2026"
    }
  }

  // Probe all candidates in parallel (batched to avoid hammering the API)
  const tabNames = [...candidateTabs];
  const BATCH_SIZE = 6;
  const allRows = [];

  // Keep track of which first-data-rows we've seen to avoid duplicates
  const seenFirstRows = new Set();
  if (referenceFirstRow) {
    seenFirstRows.add(`${referenceFirstRow[0]}|${referenceFirstRow[1]}`);
  }

  // Include primary tab rows
  if (primaryRows.length >= 2) {
    allRows.push(primaryRows);
  }

  for (let i = 0; i < tabNames.length; i += BATCH_SIZE) {
    const batch = tabNames.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((tab) =>
        tryFetchFinanceTab(spreadsheetId, tab, referenceFirstRow),
      ),
    );

    for (const rows of results) {
      if (!rows || rows.length < 2) continue;
      const headerIdx = findHeaderRowIndex(rows);
      const firstDataRow = rows[headerIdx + 1];
      if (!firstDataRow) continue;

      const key = `${firstDataRow[0]}|${firstDataRow[1]}`;
      if (seenFirstRows.has(key)) continue; // Skip duplicate tabs
      seenFirstRows.add(key);
      allRows.push(rows);
    }
  }

  // If we only got the primary tab, fall back to single-tab read
  if (allRows.length <= 1) {
    return readFinancialRecords(spreadsheetId, primaryTab);
  }

  // Merge all tab rows into unified records
  const importTimestamp = Date.now();
  let globalIndex = 0;
  const mergedRecords = [];

  for (const rows of allRows) {
    const headerRowIndex = findHeaderRowIndex(rows);
    const normalizedHeaders = (rows[headerRowIndex] || []).map(normalizeHeader);

    const columnIndex = Object.keys(FINANCE_COLUMN_ALIASES).reduce(
      (acc, key) => {
        acc[key] = resolveColumnIndex(normalizedHeaders, key);
        return acc;
      },
      {},
    );

    const dataRows = rows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      const getValue = (key) => {
        const mappedIndex = columnIndex[key];
        if (mappedIndex >= 0 && mappedIndex < row.length) {
          return row[mappedIndex] || "";
        }
        const fallbackIndex = FINANCE_FALLBACK_INDEX[key];
        if (typeof fallbackIndex === "number" && fallbackIndex < row.length) {
          return row[fallbackIndex] || "";
        }
        return "";
      };

      const record = {
        id: `sheet_${globalIndex}_${importTimestamp}`,
        date: parseSheetDate(getValue("date")),
        description: getValue("description"),
        interestRate: parseSheetNumber(getValue("interestRate")),
        income: parseSheetNumber(getValue("income")),
        expenses: parseSheetNumber(getValue("expenses")),
        minimumExpenses: parseSheetNumber(getValue("minimumExpenses")),
        balance: parseSheetNumber(getValue("balance")),
        dueDate: parseSheetDate(getValue("dueDate")),
        paymentMethod: getValue("paymentMethod"),
        howPaid: getValue("howPaid"),
        done: parseSheetBoolean(getValue("done")),
        type: getValue("type"),
        note: getValue("note"),
        lastModified: new Date().toISOString(),
      };

      if (record.date && record.description) {
        mergedRecords.push(record);
        globalIndex++;
      }
    }
  }

  // Sort records: Date (Desc) -> Amount (Desc) -> Description (Asc)
  mergedRecords.sort((a, b) => {
    // 1. Date Ascending (Oldest to Newest)
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;

    // 2. Amount Descending (Income + Expenses magnitude)
    // We treat 'amount' as the effective flow. Since expenses are positive in the record but logic implies flow,
    // let's just sort by magnitude of relevant value.
    // Or maybe Income - Expenses?
    // User said "amount". Let's assume largest transaction first.
    const amountA = (a.income || 0) + (a.expenses || 0);
    const amountB = (b.income || 0) + (b.expenses || 0);
    if (amountA > amountB) return -1;
    if (amountA < amountB) return 1;

    // 3. Description Ascending
    return (a.description || '').localeCompare(b.description || '');
  });

  return mergedRecords;
}

/**
 * Read financial records from multiple monthly sheet tabs
 * Fetches each tab sequentially, skips tabs that don't exist or are empty
 */
export async function readAllMonthlyRecords(spreadsheetId, monthTabs, onProgress) {
  const allRecords = [];
  for (let i = 0; i < monthTabs.length; i++) {
    const tab = monthTabs[i];
    if (onProgress) onProgress({ current: i + 1, total: monthTabs.length, tab });
    try {
      const records = await readFinancialRecords(spreadsheetId, tab);
      allRecords.push(...records);
    } catch (err) {
      console.warn(`Skipping tab "${tab}":`, err.message);
    }
  }
  return allRecords;
}
