import { useRef, useState, useEffect, useMemo } from 'react';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useCurrencyStore } from '@store/currencyStore';
import { toMonthly, formatCurrency } from '@shared/lib/currencies';
import { SankeyLayout, linkPath } from '@shared/lib/sankeyLayout';

export default function SankeyView() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState(null);

  const subs = useSubscriptionStore((s) => s.subs);
  const income = useSubscriptionStore((s) => s.income);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(350, width * 0.7) });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { nodes, links } = useMemo(() => {
    if (dimensions.width === 0 || subs.length === 0) return { nodes: [], links: [] };

    const layout = new SankeyLayout(dimensions.width, dimensions.height);
    return layout.layout(income, subs, (sub) =>
      Math.max(0.01, toMonthly(sub, selectedCurrency, currencies))
    );
  }, [subs, income, selectedCurrency, currencies, dimensions]);

  if (subs.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
        <p className="text-sm text-slate-400">Add subscriptions to see the Sankey diagram</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="relative overflow-hidden rounded-2xl bg-white border border-slate-100"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* SVG Links layer */}
        <svg
          className="absolute inset-0"
          width={dimensions.width}
          height={dimensions.height}
          style={{ pointerEvents: 'none' }}
        >
          {links.map((link, i) => {
            const isHighlighted =
              hoveredId === link.source || hoveredId === link.target;
            return (
              <path
                key={`${link.source}-${link.target}-${i}`}
                d={linkPath(link)}
                fill={link.color}
                opacity={hoveredId ? (isHighlighted ? 0.5 : 0.1) : 0.3}
                className="transition-opacity duration-200"
              />
            );
          })}
        </svg>

        {/* Nodes layer */}
        {nodes.map((node) => {
          const isHovered = hoveredId === node.id;
          const showLabel = node.height >= 20;
          const showValue = node.height >= 36;

          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center justify-center overflow-hidden rounded-lg border border-white/60 transition-all duration-200 cursor-default"
              style={{
                left: node.x,
                top: node.y,
                width: Math.max(0, node.width),
                height: Math.max(0, node.height),
                backgroundColor: node.color,
                transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                zIndex: isHovered ? 10 : 2,
                boxShadow: isHovered
                  ? '0 4px 12px rgba(0,0,0,0.15)'
                  : '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={`${node.label}: ${formatCurrency(node.value, selectedCurrency, currencies)}/mo`}
            >
              {showLabel && (
                <span className="truncate px-1 text-center text-xs font-semibold text-slate-700 leading-tight">
                  {node.label}
                </span>
              )}
              {showValue && (
                <span className="text-xs text-slate-500 leading-tight">
                  {formatCurrency(node.value, selectedCurrency, currencies)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {income === 0 && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Set your monthly income in Settings to see the full income flow
        </p>
      )}
    </div>
  );
}
