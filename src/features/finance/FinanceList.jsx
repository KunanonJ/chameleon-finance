import { useState, useMemo } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { FINANCE_TYPES } from '@shared/lib/financeConstants';
import { filterRecords } from '@shared/lib/financeUtils';
import FinanceRecordCard from '@features/finance/FinanceRecordCard';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatMonthKey(key) {
  const [y, m] = key.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

export default function FinanceList({ onEdit, onOpenModal }) {
  const records = useFinanceStore((s) => s.records);
  const filters = useFinanceStore((s) => s.filters);
  const setFilter = useFinanceStore((s) => s.setFilter);
  const removeRecord = useFinanceStore((s) => s.removeRecord);
  const [collapsed, setCollapsed] = useState(new Set());

  const filtered = filterRecords(records, filters);

  // Sort by Date (Desc) -> Amount (Desc) -> Description (Asc)
  const sorted = [...filtered].sort((a, b) => {
    // 1. Date Ascending (Oldest to Newest)
    if (a.date !== b.date) {
      if (!a.date) return -1; // No date comes first? Or last? Usually last.
      if (!b.date) return 1;
      return a.date.localeCompare(b.date); // Ascending
    }

    // 2. Amount Descending (Income + Expenses magnitude)
    const amountA = (parseFloat(a.income) || 0) + (parseFloat(a.expenses) || 0);
    const amountB = (parseFloat(b.income) || 0) + (parseFloat(b.expenses) || 0);
    if (amountA !== amountB) {
      return amountB - amountA; // Descending
    }

    // 3. Description Ascending
    const descA = a.description || '';
    const descB = b.description || '';
    return descA.localeCompare(descB);
  });

  // Group by month
  const groups = useMemo(() => {
    const map = new Map();
    for (const record of sorted) {
      const d = record.date ? new Date(record.date) : null;
      const key = d && !isNaN(d.getTime())
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : 'undated';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(record);
    }
    return Array.from(map.entries());
  }, [sorted]);

  const toggleCollapse = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

      {/* Record List grouped by month */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-12 dark:border-slate-600">
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No financial records yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Add a record or sync from Google Sheets</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(([monthKey, monthRecords]) => {
            const isCollapsed = collapsed.has(monthKey);
            const totalIncome = monthRecords.reduce((sum, r) => sum + (r.income || 0), 0);
            const totalExpenses = monthRecords.reduce((sum, r) => sum + (r.expenses || 0), 0);
            const label = monthKey === 'undated' ? 'Undated' : formatMonthKey(monthKey);

            return (
              <div key={monthKey}>
                {/* Month Header */}
                <button
                  onClick={() => toggleCollapse(monthKey)}
                  className="mb-2 flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 transition-colors hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700/60"
                >
                  <svg
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${isCollapsed ? '' : 'rotate-90'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {label}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {monthRecords.length} record{monthRecords.length !== 1 ? 's' : ''}
                  </span>
                  <div className="ml-auto flex items-center gap-3">
                    {totalIncome > 0 && (
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                        +{totalIncome.toLocaleString()}
                      </span>
                    )}
                    {totalExpenses > 0 && (
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        -{totalExpenses.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>

                {/* Records */}
                {!isCollapsed && (
                  <div className="space-y-2">
                    {monthRecords.map((record) => (
                      <FinanceRecordCard
                        key={record.id}
                        record={record}
                        onEdit={onEdit}
                        onRemove={removeRecord}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
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
