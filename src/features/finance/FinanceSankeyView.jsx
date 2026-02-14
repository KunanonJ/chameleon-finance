import { useRef, useState, useEffect, useMemo } from 'react';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { formatCurrency } from '@shared/lib/currencies';
import { getTypeColor, getTypeLabel } from '@shared/lib/financeConstants';

function getTextColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1e293b' : '#ffffff';
}

/**
 * 3-column Sankey for finance:
 * Layer 1: Income (total)
 * Layer 2: Expenses (total)
 * Layer 3: Net Balance + Expense breakdown by type
 */
function layoutFinanceSankey(width, height, totalIncome, totalExpenses, expenseRecords) {
  const nodeWidth = width * 0.12;
  const nodePadding = 8;
  const topPadding = 10;
  const availableHeight = height - topPadding * 2;

  const col0X = width * 0.05;
  const col1X = width * 0.44;
  const col2X = width * 0.83;

  const effectiveIncome = Math.max(totalIncome, totalExpenses) || 1;
  const netBalance = Math.max(0, totalIncome - totalExpenses);

  // Group expense records by type
  const typeMap = {};
  for (const r of expenseRecords) {
    const type = r.type || 'Other';
    if (!typeMap[type]) typeMap[type] = 0;
    typeMap[type] += r.expenses || 0;
  }
  const types = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  const nodes = [];
  const links = [];

  // --- COLUMN 0: Income ---
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

  // --- COLUMN 1: Total Expenses ---
  const expenseHeight = totalExpenses > 0
    ? Math.max(16, (totalExpenses / effectiveIncome) * availableHeight)
    : 0;

  let expenseNode = null;
  if (totalExpenses > 0) {
    expenseNode = {
      id: '_expenses',
      label: 'Expenses',
      value: totalExpenses,
      x: col1X,
      y: topPadding,
      width: nodeWidth,
      height: expenseHeight,
      color: '#ef4444',
      column: 1,
    };
    nodes.push(expenseNode);
  }

  // --- COLUMN 2: Net Balance + Expense breakdown by type ---
  const col2Count = types.length + (netBalance > 0 ? 1 : 0);
  const col2PaddingTotal = Math.max(0, col2Count - 1) * nodePadding;
  const col2AvailableHeight = availableHeight - col2PaddingTotal;

  let col2Y = topPadding;
  const typeNodes = [];

  // Expense type breakdown nodes
  for (const [typeId, typeTotal] of types) {
    const h = Math.max(16, (typeTotal / effectiveIncome) * col2AvailableHeight);
    const node = {
      id: `_type_${typeId}`,
      label: getTypeLabel(typeId),
      value: typeTotal,
      x: col2X,
      y: col2Y,
      width: nodeWidth,
      height: h,
      color: getTypeColor(typeId),
      column: 2,
    };
    nodes.push(node);
    typeNodes.push(node);
    col2Y += h + nodePadding;
  }

  // Net Balance node
  let balanceNode = null;
  if (netBalance > 0) {
    const h = Math.max(16, (netBalance / effectiveIncome) * col2AvailableHeight);
    balanceNode = {
      id: '_balance',
      label: 'Net Balance',
      value: netBalance,
      x: col2X,
      y: col2Y,
      width: nodeWidth,
      height: h,
      color: '#86efac',
      column: 2,
    };
    nodes.push(balanceNode);
  }

  // --- LINKS ---

  // Income → Expenses (col 0 → col 1)
  if (expenseNode && totalExpenses > 0) {
    const linkHeight = (totalExpenses / effectiveIncome) * availableHeight;
    links.push({
      source: '_income',
      target: '_expenses',
      value: totalExpenses,
      sourceX: col0X + nodeWidth,
      sourceY: topPadding,
      sourceHeight: linkHeight,
      targetX: col1X,
      targetY: expenseNode.y,
      targetHeight: expenseNode.height,
      color: '#ef4444',
    });
  }

  // Income → Net Balance (col 0 → col 2, skips col 1)
  if (balanceNode && netBalance > 0) {
    const expenseLinkHeight = (totalExpenses / effectiveIncome) * availableHeight;
    const balanceLinkHeight = (netBalance / effectiveIncome) * availableHeight;
    links.push({
      source: '_income',
      target: '_balance',
      value: netBalance,
      sourceX: col0X + nodeWidth,
      sourceY: topPadding + expenseLinkHeight,
      sourceHeight: balanceLinkHeight,
      targetX: col2X,
      targetY: balanceNode.y,
      targetHeight: balanceNode.height,
      color: '#86efac',
    });
  }

  // Expenses → each expense type (col 1 → col 2)
  if (expenseNode && totalExpenses > 0) {
    let expYOffset = expenseNode.y;
    for (const typeNode of typeNodes) {
      const linkHeight = (typeNode.value / totalExpenses) * expenseNode.height;
      links.push({
        source: '_expenses',
        target: typeNode.id,
        value: typeNode.value,
        sourceX: col1X + nodeWidth,
        sourceY: expYOffset,
        sourceHeight: linkHeight,
        targetX: col2X,
        targetY: typeNode.y,
        targetHeight: typeNode.height,
        color: typeNode.color,
      });
      expYOffset += linkHeight;
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

export default function FinanceSankeyView({ records: recordsProp }) {
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
      setDimensions({ width, height: Math.max(350, width * 0.7) });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { nodes, links } = useMemo(() => {
    if (dimensions.width === 0 || records.length === 0) return { nodes: [], links: [] };

    let totalIncome = 0;
    let totalExpenses = 0;
    for (const r of records) {
      totalIncome += r.income || 0;
      totalExpenses += r.expenses || 0;
    }

    if (totalIncome === 0 && totalExpenses === 0) return { nodes: [], links: [] };

    const expenseRecords = records.filter((r) => (r.expenses || 0) > 0);

    return layoutFinanceSankey(dimensions.width, dimensions.height, totalIncome, totalExpenses, expenseRecords);
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
          const textColor = getTextColor(node.color);
          const subTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(30,41,59,0.6)';

          return (
            <div
              key={node.id}
              className="absolute flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-white/60 transition-all duration-200 hover:brightness-95 dark:border-slate-600/60"
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
                <span
                  className="truncate px-1 text-center text-xs font-semibold leading-tight"
                  style={{ color: textColor }}
                >
                  {node.label}
                </span>
              )}
              {showValue && (
                <span
                  className="text-xs leading-tight"
                  style={{ color: subTextColor }}
                >
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
