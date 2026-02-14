import { useRef, useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { computeBreakdownByType } from '@shared/lib/financeUtils';
import { getTypeColor, getTypeLabel } from '@shared/lib/financeConstants';
import { Treemap } from '@shared/lib/treemapLayout';

export default function FinanceTreemapView({ records: recordsProp }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState(null);

  const storeRecords = useFinanceStore((s) => s.records);
  const records = recordsProp || storeRecords;
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(300, width * 0.65) });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cells = useMemo(() => {
    if (dimensions.width === 0 || records.length === 0) return [];

    const breakdown = computeBreakdownByType(records);
    const items = breakdown.map((b) => ({
      id: b.type,
      name: getTypeLabel(b.type),
      color: getTypeColor(b.type),
      income: b.income,
      expenses: b.expenses,
      count: b.count,
      val: Math.max(0.01, b.income + b.expenses),
    }));

    const treemap = new Treemap(dimensions.width, dimensions.height);
    return treemap.layout(items);
  }, [records, dimensions]);

  if (records.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add records to see the treemap</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {cells.map((cell) => {
          const isSmall = cell.w < 100 || cell.h < 70;
          const isTiny = cell.w < 50 || cell.h < 40;
          const isHovered = hoveredId === cell.id;

          return (
            <div
              key={cell.id}
              className="absolute flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-white/60 transition-all duration-200 hover:brightness-95"
              style={{
                left: cell.x,
                top: cell.y,
                width: Math.max(0, cell.w),
                height: Math.max(0, cell.h),
                backgroundColor: cell.color + '22',
                borderColor: cell.color + '44',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                zIndex: isHovered ? 10 : 1,
                boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              }}
              onMouseEnter={() => setHoveredId(cell.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={`${cell.name}: ${cell.count} record${cell.count !== 1 ? 's' : ''}`}
            >
              {!isTiny && (
                <span className="truncate px-1 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {cell.name}
                </span>
              )}
              {!isSmall && (
                <>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {cell.count} record{cell.count !== 1 ? 's' : ''}
                  </span>
                  {cell.income > 0 && (
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(cell.income, selectedCurrency, currencies)}
                    </span>
                  )}
                  {cell.expenses > 0 && (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(cell.expenses, selectedCurrency, currencies)}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
