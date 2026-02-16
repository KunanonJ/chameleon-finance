import { useTrends } from '@features/trends/useTrends';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';

function TrendCard({ title, data, currency, currencies }) {
  if (!data) return null;

  const isUp = data.direction === 'up';
  const isDown = data.direction === 'down';

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-1 text-xs font-medium text-slate-400 dark:text-slate-500">{title}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-lg font-bold ${isUp ? 'text-red-500' : isDown ? 'text-green-500' : 'text-slate-600 dark:text-slate-400'}`}>
          {data.change > 0 ? '+' : ''}{formatCurrency(Math.abs(data.change), currency, currencies)}
        </span>
        <span className={`text-sm ${isUp ? 'text-red-400' : isDown ? 'text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {data.percentage > 0 ? '+' : ''}{data.percentage}%
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        {isUp && (
          <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
        {isDown && (
          <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
        {!isUp && !isDown && (
          <svg className="h-3 w-3 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        )}
        <span>{data.direction === 'stable' ? 'Stable' : data.direction === 'up' ? 'Increased' : 'Decreased'}</span>
      </div>
    </div>
  );
}

export default function TrendsSection() {
  const { mom, yoy, trendDirection, hasEnoughData, downloadTrendData, recordSnapshot } = useTrends();
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  if (!hasEnoughData) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Spending Trends</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Not enough data yet. Trends will appear after at least 12 months of tracked data starting from January.
        </p>
        <button
          onClick={recordSnapshot}
          className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Record current snapshot
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Spending Trends</h3>
        <button
          onClick={downloadTrendData}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TrendCard
          title="Month over Month"
          data={mom}
          currency={selectedCurrency}
          currencies={currencies}
        />
        <TrendCard
          title="Year over Year"
          data={yoy}
          currency={selectedCurrency}
          currencies={currencies}
        />
      </div>

      {trendDirection && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">Overall trend:</span>
          <span className={`text-xs font-semibold ${
            trendDirection.direction === 'increasing' ? 'text-red-500' :
            trendDirection.direction === 'decreasing' ? 'text-green-500' :
            'text-slate-600 dark:text-slate-400'
          }`}>
            {trendDirection.direction === 'increasing' ? 'Spending is rising' :
             trendDirection.direction === 'decreasing' ? 'Spending is falling' :
             'Spending is stable'}
          </span>
        </div>
      )}
    </div>
  );
}
