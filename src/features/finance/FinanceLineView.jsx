import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { computeMonthlyTrend } from '@shared/lib/financeUtils';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@shared/ui/Chart';

export default function FinanceLineView({ records: recordsProp }) {
  const storeRecords = useFinanceStore((s) => s.records);
  const records = recordsProp || storeRecords;
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const data = useMemo(() => {
    const trend = computeMonthlyTrend(records);
    const trendMap = new Map(trend.map((entry) => [entry.month, entry]));
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });

    if (records.length === 0) return [];

    // Find the earliest date across all valid records
    const dates = records
        .map((r) => (r.date ? new Date(r.date) : null))
        .filter((d) => d && !isNaN(d.getTime()))
        .sort((a, b) => a - b);

    const now = new Date();
    // Default to 12 months ago if no valid dates found (fallback)
    let startMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    if (dates.length > 0) {
        // Start from the month of the earliest record
        startMonth = new Date(dates[0].getFullYear(), dates[0].getMonth(), 1);
    }

    // End at the current month
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate number of months to show
    const monthsToShow = (endMonth.getFullYear() - startMonth.getFullYear()) * 12 + (endMonth.getMonth() - startMonth.getMonth()) + 1;
    // Cap minimum at 6 months for better visual if very few records
    const finalMonthsToShow = Math.max(monthsToShow, 6);
    
    // Adjust startMonth if we forced minimum 6 months and real history is shorter
    if (finalMonthsToShow > monthsToShow) {
        startMonth = new Date(endMonth.getFullYear(), endMonth.getMonth() - (finalMonthsToShow - 1), 1);
    }

    return Array.from({ length: finalMonthsToShow }, (_, i) => {
      const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const bucket = trendMap.get(key);
      return {
        name: monthFormatter.format(monthDate),
        income: bucket?.income || 0,
        expenses: bucket?.expenses || 0,
      };
    });
  }, [records]);

  const fmt = (val) => formatCurrency(val, selectedCurrency, currencies);

  if (records.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add records to see the line chart</p>
      </div>
    );
  }

  return (
    <ChartContainer>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border-primary)' }}
          tickLine={false}
          interval={0}
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmt(v)}
        />
        <Tooltip content={<ChartTooltipContent formatter={fmt} />} />
        <Legend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="income"
          name="Income"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={{ r: 4, fill: 'var(--chart-2)' }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="var(--chart-3)"
          strokeWidth={2}
          dot={{ r: 4, fill: 'var(--chart-3)' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
