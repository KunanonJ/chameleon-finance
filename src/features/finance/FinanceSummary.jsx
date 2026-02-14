import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { computeSummary } from '@shared/lib/financeUtils';

export default function FinanceSummary({ records: recordsProp }) {
  const storeRecords = useFinanceStore((s) => s.records);
  const filters = useFinanceStore((s) => s.filters);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);
  const records = recordsProp || storeRecords;

  const summary = computeSummary(records, filters);

  const cards = [
    { label: 'Total Income', value: summary.totalIncome, color: 'text-green-600 dark:text-green-400' },
    { label: 'Total Expenses', value: summary.totalExpenses, color: 'text-red-600 dark:text-red-400' },
    { label: 'Min. Expenses', value: summary.totalMinimumExpenses, color: 'text-orange-600 dark:text-orange-400' },
    { label: 'Net Balance', value: summary.netBalance, color: summary.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">{card.label}</div>
          <div className={`text-xl font-bold ${card.color}`}>
            {formatCurrency(Math.abs(card.value), selectedCurrency, currencies)}
          </div>
        </div>
      ))}
    </div>
  );
}
