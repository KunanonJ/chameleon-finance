import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useCurrencyStore } from '@store/currencyStore';
import { toMonthly, formatCurrency } from '@shared/lib/currencies';
import { getColor } from '@shared/lib/constants';
import { ChartContainer, ChartTooltipContent } from '@shared/ui/Chart';

export default function BarView() {
  const subs = useSubscriptionStore((s) => s.subs);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const data = useMemo(() => {
    return subs
      .map((sub) => ({
        name: sub.name,
        cost: toMonthly(sub, selectedCurrency, currencies),
        color: getColor(sub.color).accent,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [subs, selectedCurrency, currencies]);

  const fmt = (val) => formatCurrency(val, selectedCurrency, currencies);

  if (subs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add subscriptions to see the bar chart</p>
      </div>
    );
  }

  return (
    <ChartContainer>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border-primary)' }}
          tickLine={false}
          interval={0}
          angle={data.length > 5 ? -30 : 0}
          textAnchor={data.length > 5 ? 'end' : 'middle'}
          height={data.length > 5 ? 60 : 30}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmt(v)}
        />
        <Tooltip content={<ChartTooltipContent formatter={fmt} />} />
        <Bar dataKey="cost" name="Monthly Cost" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
