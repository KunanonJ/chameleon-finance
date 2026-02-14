import { useRef, useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { getTypeColor, getTypeLabel } from '@shared/lib/financeConstants';

/**
 * 3-column Sankey for finance: Income → Expense Types → Individual Records
 */
function layoutFinanceSankey(width, height, totalIncome, expenseRecords) {
  if (expenseRecords.length === 0) return { nodes: [], links: [] };

  const nodeWidth = width * 0.12;
  const nodePadding = 8;
  const topPadding = 10;
  const availableHeight = height - topPadding * 2;

  const col0X = width * 0.05;
  const col1X = width * 0.44;
  const col2X = width * 0.83;

  // Group records by type
  const typeMap = {};
  let totalExpenses = 0;
  for (const r of expenseRecords) {
    const type = r.type || 'Other';
    if (!typeMap[type]) {
      typeMap[type] = { records: [], total: 0 };
    }
    typeMap[type].records.push(r);
    typeMap[type].total += r.expenses || 0;
    totalExpenses += r.expenses || 0;
  }

  const effectiveIncome = Math.max(totalIncome, totalExpenses) || 1;
  const remaining = Math.max(0, totalIncome - totalExpenses);
  const types = Object.entries(typeMap).sort((a, b) => b[1].total - a[1].total);

  const nodes = [];
  const links = [];

  // --- LEFT COLUMN: Income node ---
  nodes.push({
    id: '_income',
    label: 'Income',
    value: effectiveIncome,
    x: col0X,
    y: topPadding,
    width: nodeWidth,
    height: availableHeight,
    color: '#22c55e',
    column: 0,
  });

  // --- MIDDLE COLUMN: Expense type nodes ---
  const midCount = types.length + (remaining > 0 ? 1 : 0);
  const midPaddingTotal = Math.max(0, midCount - 1) * nodePadding;
  const midAvailableHeight = availableHeight - midPaddingTotal;

  let midY = topPadding;
  const typeNodes = [];

  for (const [typeId, typeData] of types) {
    const h = Math.max(16, (typeData.total / effectiveIncome) * midAvailableHeight);
    const node = {
      id: `_type_${typeId}`,
      label: getTypeLabel(typeId),
      value: typeData.total,
      x: col1X,
      y: midY,
      width: nodeWidth,
      height: h,
      color: getTypeColor(typeId),
      column: 1,
    };
    nodes.push(node);
    typeNodes.push({ node, typeId, typeData });
    midY += h + nodePadding;
  }

  // Remaining/Savings node in middle column
  let remainingNode = null;
  if (remaining > 0) {
    const h = Math.max(16, (remaining / effectiveIncome) * midAvailableHeight);
    remainingNode = {
      id: '_remaining',
      label: 'Savings',
      value: remaining,
      x: col1X,
      y: midY,
      width: nodeWidth,
      height: h,
      color: '#86efac',
      column: 1,
    };
    nodes.push(remainingNode);
  }

  // --- RIGHT COLUMN: Individual record nodes ---
  for (const { node: typeNode, typeData } of typeNodes) {
    const recs = typeData.records.sort((a, b) => (b.expenses || 0) - (a.expenses || 0));
    const recPaddingTotal = Math.max(0, recs.length - 1) * (nodePadding / 2);
    const recAvailableHeight = typeNode.height - recPaddingTotal;

    let recY = typeNode.y;

    for (const rec of recs) {
      const expense = rec.expenses || 0;
      const h = Math.max(12, (expense / typeData.total) * recAvailableHeight);
      const recNode = {
        id: rec.id,
        label: rec.description,
        value: expense,
        x: col2X,
        y: recY,
        width: nodeWidth,
        height: h,
        color: getTypeColor(rec.type),
        column: 2,
      };
      nodes.push(recNode);
      recY += h + nodePadding / 2;
    }
  }

  // --- LINKS: Income → Types ---
  let incomeYOffset = topPadding;
  for (const { node: typeNode } of typeNodes) {
    const linkHeight = (typeNode.value / effectiveIncome) * availableHeight;
    links.push({
      source: '_income',
      target: typeNode.id,
      value: typeNode.value,
      sourceX: col0X + nodeWidth,
      sourceY: incomeYOffset,
      sourceHeight: linkHeight,
      targetX: col1X,
      targetY: typeNode.y,
      targetHeight: typeNode.height,
      color: typeNode.color,
    });
    incomeYOffset += linkHeight;
  }

  // Income → Remaining link
  if (remainingNode && remaining > 0) {
    const linkHeight = (remaining / effectiveIncome) * availableHeight;
    links.push({
      source: '_income',
      target: '_remaining',
      value: remaining,
      sourceX: col0X + nodeWidth,
      sourceY: incomeYOffset,
      sourceHeight: linkHeight,
      targetX: col1X,
      targetY: remainingNode.y,
      targetHeight: remainingNode.height,
      color: remainingNode.color,
    });
  }

  // --- LINKS: Types → Individual Records ---
  for (const { node: typeNode, typeData } of typeNodes) {
    const recs = typeData.records.sort((a, b) => (b.expenses || 0) - (a.expenses || 0));
    let typeYOffset = typeNode.y;

    for (const rec of recs) {
      const recNode = nodes.find((n) => n.id === rec.id);
      if (!recNode) continue;

      const expense = rec.expenses || 0;
      const linkHeight = (expense / typeData.total) * typeNode.height;
      links.push({
        source: typeNode.id,
        target: rec.id,
        value: expense,
        sourceX: col1X + nodeWidth,
        sourceY: typeYOffset,
        sourceHeight: linkHeight,
        targetX: col2X,
        targetY: recNode.y,
        targetHeight: recNode.height,
        color: typeNode.color,
      });
      typeYOffset += linkHeight;
    }
  }

  return { nodes, links };
}

function sankeyLinkPath(link) {
  const { sourceX, sourceY, sourceHeight, targetX, targetY, targetHeight } = link;
  const midX = (sourceX + targetX) / 2;

  return [
    `M ${sourceX} ${sourceY}`,
    `C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`,
    `L ${targetX} ${targetY + targetHeight}`,
    `C ${midX} ${targetY + targetHeight}, ${midX} ${sourceY + sourceHeight}, ${sourceX} ${sourceY + sourceHeight}`,
    'Z',
  ].join(' ');
}

export default function FinanceSankeyView() {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState(null);

  const records = useFinanceStore((s) => s.records);
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
    if (dimensions.width === 0 || records.length === 0) return { nodes: [], links: [] };

    let totalIncome = 0;
    for (const r of records) totalIncome += r.income || 0;

    // Only include records that have expenses
    const expenseRecords = records.filter((r) => (r.expenses || 0) > 0);

    return layoutFinanceSankey(dimensions.width, dimensions.height, totalIncome, expenseRecords);
  }, [records, dimensions]);

  if (records.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600">
        <p className="text-sm text-slate-400 dark:text-slate-500">Add records to see the Sankey diagram</p>
      </div>
    );
  }

  // Collect linked node IDs for hover highlighting
  const getLinkedIds = (id) => {
    const linked = new Set([id]);
    for (const link of links) {
      if (link.source === id) linked.add(link.target);
      if (link.target === id) linked.add(link.source);
    }
    return linked;
  };

  const highlightedIds = hoveredId ? getLinkedIds(hoveredId) : null;

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800"
        style={{ width: dimensions.width, height: dimensions.height }}
      >
        {/* SVG Links */}
        <svg
          className="absolute inset-0"
          width={dimensions.width}
          height={dimensions.height}
          style={{ pointerEvents: 'none' }}
        >
          {links.map((link, i) => {
            const isHighlighted = highlightedIds
              ? highlightedIds.has(link.source) || highlightedIds.has(link.target)
              : false;
            return (
              <path
                key={`${link.source}-${link.target}-${i}`}
                d={sankeyLinkPath(link)}
                fill={link.color}
                opacity={hoveredId ? (isHighlighted ? 0.5 : 0.08) : 0.3}
                className="transition-opacity duration-200"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredId === node.id;
          const showLabel = node.height >= 20;
          const showValue = node.height >= 36;

          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center justify-center overflow-hidden rounded-lg border border-white/60 transition-all duration-200 cursor-default dark:border-slate-600/60"
              style={{
                left: node.x,
                top: node.y,
                width: Math.max(0, node.width),
                height: Math.max(0, node.height),
                backgroundColor: node.color,
                transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                zIndex: isHovered ? 10 : 2,
                boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={`${node.label}: ${formatCurrency(node.value, selectedCurrency, currencies)}`}
            >
              {showLabel && (
                <span className="truncate px-1 text-center text-xs font-semibold leading-tight text-slate-700 dark:text-slate-200">
                  {node.label}
                </span>
              )}
              {showValue && (
                <span className="text-xs leading-tight text-slate-500 dark:text-slate-400">
                  {formatCurrency(node.value, selectedCurrency, currencies)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
