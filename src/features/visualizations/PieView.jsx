import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useCurrencyStore } from '@store/currencyStore';
import { toMonthly, formatCurrency } from '@shared/lib/currencies';
import { getColor } from '@shared/lib/constants';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@shared/ui/Chart';

export default function PieView() {
  const subs = useSubscriptionStore((s) => s.subs);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const { data, total } = useMemo(() => {
    let sum = 0;
    const items = subs.map((sub) => {
      const cost = toMonthly(sub, selectedCurrency, currencies);
      sum += cost;
      return {
        name: sub.name,
        value: cost,
        color: getColor(sub.color).accent,
      };
    }).sort((a, b) => b.value - a.value);
    return { data: items, total: sum };
  }, [subs, selectedCurrency, currencies]);

  const fmt = (val) => formatCurrency(val, selectedCurrency, currencies);

  if (subs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add subscriptions to see the pie chart</p>
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
          paddingAngle={2}
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
        >
          <tspan x="50%" dy="-0.5em" fontSize="12" fill="var(--text-secondary)">Monthly</tspan>
          <tspan x="50%" dy="1.4em" fontSize="14" fontWeight="bold" fill="var(--text-primary)">{fmt(total)}</tspan>
        </text>
      </PieChart>
    </ChartContainer>
  );
}
