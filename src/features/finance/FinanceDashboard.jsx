import { useMemo } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { computeBreakdownByType, computeMonthlyTrend } from '@shared/lib/financeUtils';
import { getTypeColor, getTypeLabel } from '@shared/lib/financeConstants';
import FinanceTreemapView from '@features/finance/FinanceTreemapView';
import FinanceBarView from '@features/finance/FinanceBarView';
import FinanceLineView from '@features/finance/FinanceLineView';
import FinancePieView from '@features/finance/FinancePieView';
import FinanceAreaView from '@features/finance/FinanceAreaView';
import FinanceSankeyView from '@features/finance/FinanceSankeyView';

export default function FinanceDashboard({ currentView, records: recordsProp }) {
  const storeRecords = useFinanceStore((s) => s.records);
  const records = recordsProp || storeRecords;
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const breakdown = useMemo(() => computeBreakdownByType(records), [records]);
  const monthlyTrend = useMemo(() => computeMonthlyTrend(records), [records]);

  const maxAmount = useMemo(() => {
    let max = 0;
    for (const b of breakdown) {
      const total = b.income + b.expenses;
      if (total > max) max = total;
    }
    return max || 1;
  }, [breakdown]);

  const maxMonthly = useMemo(() => {
    let max = 0;
    for (const m of monthlyTrend) {
      if (m.income > max) max = m.income;
      if (m.expenses > max) max = m.expenses;
    }
    return max || 1;
  }, [monthlyTrend]);

  const formatMonth = (key) => {
    const [y, m] = key.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Visualization */}
      {currentView === 'bar' && <FinanceBarView records={records} />}
      {currentView === 'line' && <FinanceLineView records={records} />}
      {currentView === 'pie' && <FinancePieView records={records} />}
      {currentView === 'area' && <FinanceAreaView records={records} />}
      {currentView === 'treemap' && <FinanceTreemapView records={records} />}
      {currentView === 'sankey' && <FinanceSankeyView records={records} />}

      {/* Breakdown by Type */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Breakdown by Type</h3>
        {breakdown.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No data yet</p>
        ) : (
          <div className="space-y-3">
            {breakdown.map((b) => {
              const total = b.income + b.expenses;
              const pct = (total / maxAmount) * 100;
              return (
                <div key={b.type}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: getTypeColor(b.type) }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {getTypeLabel(b.type)}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        ({b.count} record{b.count !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      {b.income > 0 && (
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          +{formatCurrency(b.income, selectedCurrency, currencies)}
                        </span>
                      )}
                      {b.expenses > 0 && (
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          -{formatCurrency(b.expenses, selectedCurrency, currencies)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: getTypeColor(b.type),
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Income vs Expenses */}
      {monthlyTrend.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-slate-500 dark:text-slate-400">Monthly Overview</h3>
          <div className="space-y-4">
            {monthlyTrend.map((m) => (
              <div key={m.month}>
                <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {formatMonth(m.month)}
                </div>
                <div className="space-y-1">
                  {/* Income bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-right text-xs text-green-600 dark:text-green-400">Income</span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${(m.income / maxMonthly) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-24 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {formatCurrency(m.income, selectedCurrency, currencies)}
                    </span>
                  </div>
                  {/* Expenses bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-right text-xs text-red-600 dark:text-red-400">Expenses</span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-red-500 transition-all"
                          style={{ width: `${(m.expenses / maxMonthly) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-24 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {formatCurrency(m.expenses, selectedCurrency, currencies)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
