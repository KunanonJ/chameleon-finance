import { FINANCE_TYPES } from '@shared/lib/financeConstants';

const VALID_TYPE_IDS = new Set(FINANCE_TYPES.map((t) => t.id));

const COLUMN_ALIASES = {
  date: ['date', 'transactiondate', 'posteddate', 'valuedate', 'bookingdate', 'recorddate'],
  description: ['description', 'details', 'narration', 'merchant', 'name', 'memo', 'reference', 'transactiondetails'],
  amount: ['amount', 'transactionamount', 'value', 'netamount'],
  debit: ['debit', 'withdrawal', 'outflow', 'expense', 'expenses', 'amountout'],
  credit: ['credit', 'deposit', 'inflow', 'income', 'amountin'],
  balance: ['balance', 'runningbalance', 'availablebalance'],
  type: ['type', 'category'],
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function countDelimiter(line, delimiter) {
  let count = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) || '';
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;
  for (const delimiter of candidates) {
    const score = countDelimiter(firstLine, delimiter);
    if (score > bestCount) {
      best = delimiter;
      bestCount = score;
    }
  }
  return best;
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if (ch === '\n' && !inQuotes) {
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      current = '';
    } else if (ch === '\r') {
      // Ignore carriage return.
    } else {
      current += ch;
    }
  }

  row.push(current.trim());
  if (row.some((cell) => cell !== '')) rows.push(row);
  return rows;
}

function parseAmount(raw) {
  if (raw === null || raw === undefined) return null;
  let value = String(raw).trim();
  if (!value) return null;

  let isNegative = false;
  if (value.includes('(') && value.includes(')')) isNegative = true;
  if (/\bdr\b/i.test(value)) isNegative = true;

  value = value
    .replace(/[()]/g, '')
    .replace(/\bcr\b/gi, '')
    .replace(/\bdr\b/gi, '')
    .replace(/[^\d,.\-]/g, '');

  if (!value) return null;

  if (value.includes(',') && value.includes('.')) {
    if (value.lastIndexOf(',') > value.lastIndexOf('.')) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else {
      value = value.replace(/,/g, '');
    }
  } else if (value.includes(',') && !value.includes('.')) {
    const parts = value.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      value = parts[0] + '.' + parts[1];
    } else {
      value = value.replace(/,/g, '');
    }
  }

  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) return null;
  if (isNegative && parsed > 0) return -parsed;
  return parsed;
}

function toIsoDate(raw) {
  if (raw === null || raw === undefined) return '';
  const value = String(raw).trim();
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value)) {
    const [partA, partB, yearRaw] = value.split(/[/-]/);
    const a = parseInt(partA, 10);
    const b = parseInt(partB, 10);
    const year = parseInt(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw, 10);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(year)) return '';

    let day = a;
    let month = b;
    if (a <= 12 && b > 12) {
      day = b;
      month = a;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return '';

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.split(/[/-]/);
    const year = parseInt(yearRaw, 10);
    const month = parseInt(monthRaw, 10);
    const day = parseInt(dayRaw, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
    if (month < 1 || month > 12 || day < 1 || day > 31) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = parseFloat(value);
    if (serial >= 25000 && serial <= 70000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const millis = excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000;
      const date = new Date(millis);
      return date.toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function detectIndexes(headers) {
  const normalized = headers.map(normalizeHeader);
  const indexes = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    indexes[field] = normalized.findIndex((header) => aliases.includes(header));
  }
  return indexes;
}

function looksLikeHeader(indexes) {
  return indexes.date >= 0 && indexes.description >= 0 && (
    indexes.amount >= 0 ||
    indexes.debit >= 0 ||
    indexes.credit >= 0
  );
}

function inferType(typeRaw, income, expenses, description) {
  const trimmedType = String(typeRaw || '').trim();
  if (trimmedType) {
    for (const valid of VALID_TYPE_IDS) {
      if (valid.toLowerCase() === trimmedType.toLowerCase()) return valid;
    }
  }

  if (income > 0) return 'Income';

  const lowered = String(description || '').toLowerCase();
  if (lowered.includes('loan')) return 'Loan';
  if (lowered.includes('card') || lowered.includes('visa') || lowered.includes('master')) return 'Credit Card';
  return 'Utility';
}

function toFingerprint(record) {
  const normalizedDesc = String(record.description || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return [
    record.date || '',
    normalizedDesc,
    Number(record.income || 0).toFixed(2),
    Number(record.expenses || 0).toFixed(2),
  ].join('|');
}

export function parseBankStatementText(text, fileName = 'statement.csv') {
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (rows.length === 0) {
    return { records: [], skippedRows: 0 };
  }

  const rawIndexes = detectIndexes(rows[0]);
  const hasHeader = looksLikeHeader(rawIndexes);
  const indexes = hasHeader
    ? rawIndexes
    : {
      date: 0,
      description: 1,
      amount: 2,
      debit: -1,
      credit: -1,
      balance: -1,
      type: -1,
    };
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const records = [];
  let skippedRows = 0;
  const now = Date.now();

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    const dateRaw = indexes.date >= 0 ? row[indexes.date] : '';
    const description = String(indexes.description >= 0 ? row[indexes.description] : '').trim();
    const amount = indexes.amount >= 0 ? parseAmount(row[indexes.amount]) : null;
    const debit = indexes.debit >= 0 ? parseAmount(row[indexes.debit]) : null;
    const credit = indexes.credit >= 0 ? parseAmount(row[indexes.credit]) : null;
    const balance = indexes.balance >= 0 ? parseAmount(row[indexes.balance]) : null;
    const typeRaw = indexes.type >= 0 ? row[indexes.type] : '';

    const date = toIsoDate(dateRaw);
    if (!date || !description) {
      skippedRows += 1;
      continue;
    }

    let income = 0;
    let expenses = 0;
    if (debit !== null || credit !== null) {
      income = Math.abs(credit || 0);
      expenses = Math.abs(debit || 0);
    } else if (amount !== null) {
      if (amount < 0) expenses = Math.abs(amount);
      else income = amount;
    }

    if (income === 0 && expenses === 0) {
      skippedRows += 1;
      continue;
    }

    const record = {
      id: `imp-${now}-${rowIndex}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      description,
      interestRate: 0,
      income,
      expenses,
      minimumExpenses: 0,
      balance: balance !== null ? Math.abs(balance) : 0,
      dueDate: '',
      paymentMethod: 'Bank Transfer',
      howPaid: '',
      done: true,
      type: inferType(typeRaw, income, expenses, description),
      note: `Imported from ${fileName}`,
      lastModified: new Date().toISOString(),
    };
    records.push(record);
  }

  return { records, skippedRows };
}

export function mergeImportedRecords(existingRecords, importedRecords) {
  const known = new Set(existingRecords.map(toFingerprint));
  const addedRecords = [];
  let duplicateCount = 0;

  for (const record of importedRecords) {
    const key = toFingerprint(record);
    if (known.has(key)) {
      duplicateCount += 1;
      continue;
    }
    known.add(key);
    addedRecords.push(record);
  }

  return { addedRecords, duplicateCount };
}

export async function importBankStatementFiles(files, existingRecords = []) {
  const allImported = [];
  let skippedRows = 0;
  let parsedFiles = 0;
  const skippedFiles = [];

  for (const file of files) {
    try {
      const text = await file.text();
      const parsed = parseBankStatementText(text, file.name || 'statement.csv');
      allImported.push(...parsed.records);
      skippedRows += parsed.skippedRows;
      parsedFiles += 1;
    } catch (err) {
      skippedFiles.push({
        fileName: file.name || 'unknown',
        reason: err.message || 'Unable to parse file',
      });
    }
  }

  const merged = mergeImportedRecords(existingRecords, allImported);

  return {
    addedRecords: merged.addedRecords,
    addedCount: merged.addedRecords.length,
    duplicateCount: merged.duplicateCount,
    skippedRows,
    parsedFiles,
    skippedFiles,
  };
}
