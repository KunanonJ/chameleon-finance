import { describe, expect, it } from 'vitest';
import {
  importBankStatementFiles,
  mergeImportedRecords,
  parseBankStatementText,
} from './bankStatementImport';

describe('bankStatementImport', () => {
  it('parses income and expense from Amount column', () => {
    const csv = [
      'Date,Description,Amount',
      '2026-01-01,Salary,5000',
      '2026-01-02,Coffee,-120.50',
    ].join('\n');

    const { records, skippedRows } = parseBankStatementText(csv, 'sample.csv');

    expect(skippedRows).toBe(0);
    expect(records).toHaveLength(2);
    expect(records[0].income).toBe(5000);
    expect(records[0].expenses).toBe(0);
    expect(records[0].type).toBe('Income');
    expect(records[1].income).toBe(0);
    expect(records[1].expenses).toBe(120.5);
  });

  it('parses debit and credit columns when provided', () => {
    const csv = [
      'Transaction Date,Details,Debit,Credit',
      '17/02/2026,ATM Withdrawal,100,',
      '18/02/2026,Bonus,,300',
    ].join('\n');

    const { records } = parseBankStatementText(csv, 'debit-credit.csv');

    expect(records).toHaveLength(2);
    expect(records[0].date).toBe('2026-02-17');
    expect(records[0].expenses).toBe(100);
    expect(records[1].date).toBe('2026-02-18');
    expect(records[1].income).toBe(300);
    expect(records[1].type).toBe('Income');
  });

  it('supports statements without header using date,description,amount order', () => {
    const csv = [
      '2026-03-01,Transfer In,2000',
      '2026-03-02,Restaurant,-450',
    ].join('\n');

    const { records } = parseBankStatementText(csv, 'no-header.csv');

    expect(records).toHaveLength(2);
    expect(records[0].description).toBe('Transfer In');
    expect(records[1].expenses).toBe(450);
  });

  it('deduplicates against existing records', () => {
    const existing = [{
      date: '2026-01-01',
      description: 'Salary',
      income: 5000,
      expenses: 0,
    }];
    const incoming = [
      {
        date: '2026-01-01',
        description: 'Salary',
        income: 5000,
        expenses: 0,
      },
      {
        date: '2026-01-02',
        description: 'Grocery',
        income: 0,
        expenses: 100,
      },
    ];

    const result = mergeImportedRecords(existing, incoming);
    expect(result.duplicateCount).toBe(1);
    expect(result.addedRecords).toHaveLength(1);
    expect(result.addedRecords[0].description).toBe('Grocery');
  });

  it('imports multiple files and aggregates added count', async () => {
    const fileA = {
      name: 'a.csv',
      text: async () => 'Date,Description,Amount\n2026-01-01,Salary,1000',
    };
    const fileB = {
      name: 'b.csv',
      text: async () => 'Date,Description,Amount\n2026-01-02,Coffee,-50',
    };

    const result = await importBankStatementFiles([fileA, fileB], []);

    expect(result.parsedFiles).toBe(2);
    expect(result.addedCount).toBe(2);
    expect(result.addedRecords.map((r) => r.description)).toEqual(['Salary', 'Coffee']);
  });
});
