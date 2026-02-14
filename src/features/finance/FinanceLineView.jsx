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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return trend.map((m) => {
      const [y, mo] = m.month.split('-');
      return {
        name: `${months[parseInt(mo) - 1]} ${y}`,
        income: m.income,
        expenses: m.expenses,
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
