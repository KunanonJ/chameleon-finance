import { useFinanceStore } from '@store/financeStore';
import { FINANCE_TYPES } from '@shared/lib/financeConstants';
import { filterRecords } from '@shared/lib/financeUtils';
import FinanceRecordCard from '@features/finance/FinanceRecordCard';

export default function FinanceList({ onEdit, onOpenModal }) {
  const records = useFinanceStore((s) => s.records);
  const filters = useFinanceStore((s) => s.filters);
  const setFilter = useFinanceStore((s) => s.setFilter);
  const removeRecord = useFinanceStore((s) => s.removeRecord);

  const filtered = filterRecords(records, filters);

  // Sort by date descending
  const sorted = [...filtered].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return b.date.localeCompare(a.date);
  });

  const typeFilters = [{ id: 'all', label: 'All' }, ...FINANCE_TYPES];

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          {typeFilters.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter('type', t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filters.type === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={filters.dateRange}
          onChange={(e) => setFilter('dateRange', e.target.value)}
          className="shrink-0 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
        >
          <option value="all">All Time</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="thisYear">This Year</option>
        </select>
      </div>

      {/* Record List */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-12 dark:border-slate-600">
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No financial records yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Add a record or sync from Google Sheets</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((record) => (
            <FinanceRecordCard
              key={record.id}
              record={record}
              onEdit={onEdit}
              onRemove={removeRecord}
            />
          ))}
        </div>
      )}

      {/* Add Record Button */}
      <button
        onClick={onOpenModal}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-400 transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 hover:shadow-md dark:border-slate-600 dark:text-slate-500 dark:hover:border-indigo-500 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Record
      </button>
    </div>
  );
}
