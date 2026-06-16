import { useState, useMemo } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { exportFinanceCSV } from '@shared/lib/financeUtils';
import FinanceSummary from '@features/finance/FinanceSummary';
import FinanceToolbar from '@features/finance/FinanceToolbar';
import FinanceList from '@features/finance/FinanceList';
import FinanceDashboard from '@features/finance/FinanceDashboard';
import FinanceRecordModal from '@features/finance/FinanceRecordModal';
import ViewToggle from '@features/visualizations/ViewToggle';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function FinanceSection() {
  const [step, setStep] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [currentView, setCurrentView] = useState('bar');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const records = useFinanceStore((s) => s.records);

  const monthsWithData = useMemo(() => {
    const months = new Set();
    for (const r of records) {
      if (!r.date) continue;
      const d = new Date(r.date);
      if (!isNaN(d.getTime())) months.add(d.getMonth());
    }
    return months;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedMonth === 'all') return records;
    return records.filter((r) => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d.getMonth() === selectedMonth;
    });
  }, [records, selectedMonth]);

  const handleEdit = (id) => {
    setEditId(id);
    setModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditId(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditId(null);
  };

  const handleExportCSV = () => {
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

  return (
    <div className="space-y-6">
      {/* Step 1: Record Management */}
      {step === 1 && (
        <div className={records.length > 0 ? 'space-y-6 pb-24 sm:pb-28' : 'space-y-6'}>
          <FinanceSummary />
          <FinanceToolbar />
          <FinanceList onEdit={handleEdit} onOpenModal={handleOpenModal} />

          {records.length > 0 && (
            <div
              className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
            >
              <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                <button
                  onClick={() => setStep(2)}
                  data-testid="finance-view-dashboard-button"
                  className="w-full rounded-xl bg-indigo-600 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Dashboard */}
      {step === 2 && (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <ViewToggle currentView={currentView} onViewChange={setCurrentView} />
          </div>

          {/* Month Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedMonth('all')}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedMonth === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-sm dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              Overview
            </button>
            {MONTH_LABELS.map((label, i) => {
              const hasData = monthsWithData.has(i);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedMonth(i)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedMonth === i
                      ? 'bg-indigo-600 text-white shadow-md'
                      : hasData
                        ? 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-sm dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
                        : 'border border-slate-100 text-slate-300 dark:border-slate-700 dark:text-slate-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <FinanceSummary records={filteredRecords} />
          <FinanceDashboard currentView={currentView} records={filteredRecords} />

          <button
            onClick={handleExportCSV}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:shadow-md dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </>
      )}

      <FinanceRecordModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        editId={editId}
      />
    </div>
  );
}
