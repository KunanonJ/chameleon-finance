import { ResponsiveContainer } from 'recharts';

export function ChartContainer({ children, className = '', minHeight = 300 }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${className}`}>
      <ResponsiveContainer width="100%" height={minHeight}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltipContent({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md dark:border-slate-600 dark:bg-slate-800">
      {label && (
        <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartLegendContent({ payload }) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 pt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600 dark:text-slate-300">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
