import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { computeBreakdownByType } from '@shared/lib/financeUtils';
import { getTypeColor, getTypeLabel } from '@shared/lib/financeConstants';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@shared/ui/Chart';

export default function FinancePieView({ records: recordsProp }) {
  const storeRecords = useFinanceStore((s) => s.records);
  const records = recordsProp || storeRecords;
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const { data, totalExpenses } = useMemo(() => {
    const breakdown = computeBreakdownByType(records);
    let total = 0;
    const items = breakdown
      .filter((b) => b.expenses > 0)
      .map((b) => {
        total += b.expenses;
        return {
          name: getTypeLabel(b.type),
          value: b.expenses,
          color: getTypeColor(b.type),
        };
      });
    return { data: items, totalExpenses: total };
  }, [records]);

  const fmt = (val) => formatCurrency(val, selectedCurrency, currencies);

  if (records.length === 0 || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add expense records to see the pie chart</p>
      </div>
    );
  }

  return (
    <ChartContainer>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltipContent formatter={fmt} />} />
        <Legend content={<ChartLegendContent />} />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-700 dark:fill-slate-200"
        >
          <tspan x="50%" dy="-0.5em" fontSize="12" fill="var(--text-secondary)">Total</tspan>
          <tspan x="50%" dy="1.4em" fontSize="14" fontWeight="bold" fill="var(--text-primary)">{fmt(totalExpenses)}</tspan>
        </text>
      </PieChart>
    </ChartContainer>
  );
}
