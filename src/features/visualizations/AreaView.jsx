import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useCurrencyStore } from '@store/currencyStore';
import { toMonthly, formatCurrency } from '@shared/lib/currencies';
import { CATEGORIES } from '@shared/lib/categories';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@shared/ui/Chart';

const CATEGORY_COLORS = {
  entertainment: 'var(--chart-1)',
  productivity: 'var(--chart-5)',
  health: 'var(--chart-4)',
  education: 'var(--chart-2)',
  utilities: 'var(--chart-3)',
  other: '#94a3b8',
};

export default function AreaView() {
  const subs = useSubscriptionStore((s) => s.subs);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const { data, categoryKeys } = useMemo(() => {
    const byCategory = {};
    for (const sub of subs) {
      const cat = sub.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = 0;
      byCategory[cat] += toMonthly(sub, selectedCurrency, currencies);
    }

    const keys = Object.keys(byCategory).sort((a, b) => byCategory[b] - byCategory[a]);
    const single = [{}];
    for (const key of keys) {
      single[0][key] = byCategory[key];
    }
    single[0].name = 'Categories';

    return { data: single, categoryKeys: keys };
  }, [subs, selectedCurrency, currencies]);

  const fmt = (val) => formatCurrency(val, selectedCurrency, currencies);

  if (subs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add subscriptions to see the area chart</p>
      </div>
    );
  }

  const getCategoryName = (id) => {
    const cat = Object.values(CATEGORIES).find((c) => c.id === id);
    return cat ? cat.name : id;
  };

  return (
    <ChartContainer>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
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
        {categoryKeys.map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            name={getCategoryName(key)}
            stackId="1"
            stroke={CATEGORY_COLORS[key] || '#94a3b8'}
            fill={CATEGORY_COLORS[key] || '#94a3b8'}
            fillOpacity={0.4}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
