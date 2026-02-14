import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useCurrencyStore } from '@store/currencyStore';
import { toMonthly, formatCurrency } from '@shared/lib/currencies';
import { ChartContainer, ChartTooltipContent } from '@shared/ui/Chart';

const MONTHS_TO_SHOW = 12;

export default function LineView() {
  const subs = useSubscriptionStore((s) => s.subs);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (MONTHS_TO_SHOW - 1), 1);
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' });

    const parsedSubs = subs.map((sub) => {
      const monthly = toMonthly(sub, selectedCurrency, currencies);
      const start = sub.startDate ? new Date(sub.startDate) : null;
      const startMonthDate = start && !Number.isNaN(start.getTime())
        ? new Date(start.getFullYear(), start.getMonth(), 1)
        : null;
      return { monthly, startMonthDate };
    });

    return Array.from({ length: MONTHS_TO_SHOW }, (_, i) => {
      const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      let total = 0;
      let activeSubscriptions = 0;

      for (const sub of parsedSubs) {
        const isActive = !sub.startMonthDate || sub.startMonthDate <= monthDate;
        if (isActive) {
          total += sub.monthly;
          activeSubscriptions += 1;
        }
      }

      return {
        monthKey,
        name: monthFormatter.format(monthDate),
        total: Math.round(total * 100) / 100,
        activeSubscriptions,
      };
    });
  }, [subs, selectedCurrency, currencies]);

  const fmt = (val) => formatCurrency(val, selectedCurrency, currencies);

  if (subs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add subscriptions to see the line chart</p>
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
        <Line
          type="monotone"
          dataKey="total"
          name="Monthly Total"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: 'var(--chart-1)' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
