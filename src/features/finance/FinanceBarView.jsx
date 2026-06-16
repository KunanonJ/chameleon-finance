import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { computeBreakdownByType } from '@shared/lib/financeUtils';
import { getTypeColor, getTypeLabel } from '@shared/lib/financeConstants';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@shared/ui/Chart';

export default function FinanceBarView({ records: recordsProp }) {
  const storeRecords = useFinanceStore((s) => s.records);
  const records = recordsProp || storeRecords;
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const data = useMemo(() => {
    const breakdown = computeBreakdownByType(records);
    return breakdown.map((b) => ({
      name: getTypeLabel(b.type),
      income: b.income,
      expenses: b.expenses,
      fill: getTypeColor(b.type),
    }));
  }, [records]);

  const fmt = (val) => formatCurrency(val, selectedCurrency, currencies);

  if (records.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add records to see the bar chart</p>
      </div>
    );
  }

  return (
    <ChartContainer>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border-primary)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmt(v)}
        />
        <Tooltip content={<ChartTooltipContent formatter={fmt} />} />
        <Legend content={<ChartLegendContent />} />
        <Bar dataKey="income" name="Income" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
