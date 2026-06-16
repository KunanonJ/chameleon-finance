import { useRef, useState } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { exportFinanceCSV } from '@shared/lib/financeUtils';
import { FINANCE_TEMPLATE_COPY_URL } from '@shared/lib/financeConstants';
import { useFinanceSheetsSync } from '@features/finance/useFinanceSheetsSync';
import * as SheetsAPI from '@features/sync/sheetsApi';
import { importBankStatementFiles } from '@shared/lib/bankStatementImport';

export default function FinanceToolbar() {
  const records = useFinanceStore((s) => s.records);
  const setRecords = useFinanceStore((s) => s.setRecords);
  const clearAll = useFinanceStore((s) => s.clearAll);
  const { syncStatus, syncProgress, pullFinance } = useFinanceSheetsSync();
  const connected = SheetsAPI.isConnected();
  const [confirmClear, setConfirmClear] = useState(false);
  const [importingStatements, setImportingStatements] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const statementInputRef = useRef(null);

  const handleExport = () => {
    const csv = exportFinanceCSV(records);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chameleon-finance-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyTemplate = () => {
    window.open(FINANCE_TEMPLATE_COPY_URL, '_blank');
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearAll();
    setConfirmClear(false);
  };

  const handleOpenStatementUpload = () => {
    statementInputRef.current?.click();
  };

  const handleStatementUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      setImportingStatements(true);
      setImportMessage('');

      const latestRecords = useFinanceStore.getState().records;
      const result = await importBankStatementFiles(files, latestRecords);
      let actuallyAdded = 0;
      let raceDuplicateCount = 0;

      if (result.addedRecords.length > 0) {
        const current = useFinanceStore.getState().records;
        const known = new Set(
          current.map((r) => [r.date, String(r.description || '').trim().toLowerCase(), Number(r.income || 0).toFixed(2), Number(r.expenses || 0).toFixed(2)].join('|'))
        );
        const dedupedAdditions = result.addedRecords.filter((r) => {
          const key = [r.date, String(r.description || '').trim().toLowerCase(), Number(r.income || 0).toFixed(2), Number(r.expenses || 0).toFixed(2)].join('|');
          if (known.has(key)) return false;
          known.add(key);
          return true;
        });
        raceDuplicateCount = result.addedRecords.length - dedupedAdditions.length;
        actuallyAdded = dedupedAdditions.length;
        if (dedupedAdditions.length > 0) {
          setRecords([...current, ...dedupedAdditions]);
        }
      }

      const skippedFilesCount = result.skippedFiles.length;
      const details = [
        `${actuallyAdded} imported`,
        `${result.duplicateCount + raceDuplicateCount} duplicates skipped`,
      ];
      if (result.skippedRows > 0) details.push(`${result.skippedRows} rows skipped`);
      if (skippedFilesCount > 0) details.push(`${skippedFilesCount} files failed`);
      setImportMessage(`Statements processed (${result.parsedFiles}/${files.length} files): ${details.join(', ')}.`);
    } catch (err) {
      setImportMessage(`Statement import failed: ${err.message}`);
    } finally {
      setImportingStatements(false);
      event.target.value = '';
    }
  };

  const btnClass = 'flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:shadow-md dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700';

  return (
    <div className="space-y-2">
      <input
        ref={statementInputRef}
        data-testid="statement-upload-input"
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/plain"
        multiple
        className="hidden"
        onChange={handleStatementUpload}
      />
      <div className="flex gap-2">
        <button onClick={handleExport} className={btnClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>

        <button onClick={handleCopyTemplate} className={btnClass}>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Template
        </button>

        <button
          onClick={handleOpenStatementUpload}
          disabled={importingStatements}
          className={btnClass + ' disabled:opacity-50'}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {importingStatements ? 'Importing...' : 'Upload Statements'}
        </button>

        {connected && (
          <button
            onClick={pullFinance}
            disabled={syncStatus === 'syncing'}
            className={btnClass + ' disabled:opacity-50'}
          >
            <svg className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncStatus === 'syncing' ? (syncProgress ? `Syncing ${syncProgress.current}/${syncProgress.total}...` : 'Syncing...') : 'Sync'}
          </button>
        )}

        {records.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-2.5 text-xs font-semibold transition-all ${
              confirmClear
                ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-md dark:border-red-500 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-md dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {confirmClear ? 'Confirm?' : 'Clear All'}
          </button>
        )}
      </div>
      {importMessage && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{importMessage}</p>
      )}
    </div>
  );
}
