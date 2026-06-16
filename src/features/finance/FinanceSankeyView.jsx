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
  return luminance > 0.6 ? '#0f172a' : '#ffffff';
}

/**
 * 3-column Sankey for finance:
 * Layer 1: Income (total)
 * Layer 2: Expenses (total)
 * Layer 3: Net Balance + Expense breakdown by type
 */
function layoutFinanceSankey(width, height, totalIncome, totalExpenses, expenseRecords) {
  const nodeWidth = Math.min(120, width * 0.15);
  const nodePadding = 12;
  const topPadding = 20;
  const availableHeight = height - topPadding * 2;

  const col0X = width * 0.05;
  const col1X = width * 0.5 - nodeWidth / 2;
  const col2X = width * 0.95 - nodeWidth;

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
    label: 'Total Income',
    value: totalIncome,
    x: col0X,
    y: topPadding,
    width: nodeWidth,
    height: Math.max(40, (totalIncome / effectiveIncome) * availableHeight),
    color: '#10b981', // emerald-500
    column: 0,
  });

  // --- COLUMN 1: Total Expenses ---
  // If expenses exist, place them. If 0 expenses, we skip this node visually but logically keep it simple.
  const expenseHeight = totalExpenses > 0
    ? Math.max(40, (totalExpenses / effectiveIncome) * availableHeight)
    : 0;

  let expenseNode = null;
  if (totalExpenses > 0) {
    expenseNode = {
      id: '_expenses',
      label: 'Total Expenses',
      value: totalExpenses,
      x: col1X,
      y: topPadding, // aligned top with income for cleaner look
      width: nodeWidth,
      height: expenseHeight,
      color: '#ef4444', // red-500
      column: 1,
    };
    nodes.push(expenseNode);
  }

  // --- COLUMN 2: Net Balance + Expense breakdown by type ---
  // Start stacking from top
  let col2Y = topPadding;
  
  // Net Balance node first (if positive)
  let balanceNode = null;
  if (netBalance > 0) {
    const h = Math.max(40, (netBalance / effectiveIncome) * availableHeight);
    balanceNode = {
      id: '_balance',
      label: 'Net Savings',
      value: netBalance,
      x: col2X,
      y: col2Y,
      width: nodeWidth,
      height: h,
      color: '#3b82f6', // blue-500
      column: 2,
    };
    nodes.push(balanceNode);
    col2Y += h + nodePadding;
  }

  const typeNodes = [];

  // Expense type breakdown nodes
  // Scale available height for types based on remaining space or proportional
  // Use remainder of height if balance exists
  const heightForTypes = availableHeight - (balanceNode ? (balanceNode.height + nodePadding) : 0);
  // Re-normalize type heights to fit visual space better if needed, but strict proportion is best for Sankey
  
  for (const [typeId, typeTotal] of types) {
    // Height is proportional to its share of total income (since that's the base scale)
    const h = Math.max(24, (typeTotal / effectiveIncome) * availableHeight);
    
    // Safety check to ensure we don't overflow canvas too badly if minimum heights add up
    // ... logic omitted for brevity, CSS overflow:visible handles slight overruns
    
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

  // --- LINKS ---

  // Link 1: Income -> Net Balance (direct leap)
  if (balanceNode && netBalance > 0) {
    // Source Y starts at bottom of Income node and goes up? No, logically it's the "savings" part.
    // Let's say savings is the BOTTOM part of income visually? Or TOP?
    // Often savings is visualized as the remainder. Let's put it at the bottom of Income.
    const linkValue = netBalance;
    const linkHeight = (linkValue / totalIncome) * nodes[0].height;
    
    // Placement on Income node: top or bottom?
    // Let's place it at the BOTTOM of income node to split flow
    const sourceY = nodes[0].y + nodes[0].height - linkHeight;
    
    links.push({
      source: '_income',
      target: '_balance',
      value: linkValue,
      sourceX: col0X + nodeWidth,
      sourceY: sourceY,
      sourceHeight: linkHeight,
      targetX: col2X,
      targetY: balanceNode.y,
      targetHeight: balanceNode.height,
      gradient: ['#10b981', '#3b82f6'], // green to blue
      id: 'link_savings'
    });
  }

  // Link 2: Income -> Expenses (col 0 -> col 1)
  if (expenseNode && totalExpenses > 0) {
    const linkValue = totalExpenses;
    const linkHeight = (linkValue / totalIncome) * nodes[0].height;
    
    // Placement on Income node: TOP (above savings)
    const sourceY = nodes[0].y; 

    links.push({
      source: '_income',
      target: '_expenses',
      value: linkValue,
      sourceX: col0X + nodeWidth,
      sourceY: sourceY,
      sourceHeight: linkHeight,
      targetX: col1X,
      targetY: expenseNode.y,
      targetHeight: expenseNode.height,
      gradient: ['#10b981', '#ef4444'], // green to red
      id: 'link_expenses_total'
    });
  }

  // Links 3: Expenses -> Types (col 1 -> col 2)
  if (expenseNode) {
    let currentExpY = expenseNode.y;
    typeNodes.forEach((tNode, i) => {
        const linkValue = tNode.value;
        const linkHeight = (linkValue / totalExpenses) * expenseNode.height;

        links.push({
            source: '_expenses',
            target: tNode.id,
            value: linkValue,
            sourceX: col1X + nodeWidth,
            sourceY: currentExpY,
            sourceHeight: linkHeight,
            targetX: col2X,
            targetY: tNode.y,
            targetHeight: tNode.height,
            gradient: ['#ef4444', tNode.color], // red to type color
            id: `link_type_${i}`
        });

        currentExpY += linkHeight;
    });
  }

  return { nodes, links };
}

function sankeyLinkPath(link) {
  const { sourceX, sourceY, sourceHeight, targetX, targetY, targetHeight } = link;
  const curvature = 0.5;
  const xi = d3_interpolateNumber(sourceX, targetX);
  const x0 = xi(curvature);
  const x1 = xi(1 - curvature);
  
  return `
    M${sourceX},${sourceY}
    C${x0},${sourceY} ${x1},${targetY} ${targetX},${targetY}
    L${targetX},${targetY + targetHeight}
    C${x1},${targetY + targetHeight} ${x0},${sourceY + sourceHeight} ${sourceX},${sourceY + sourceHeight}
    Z
  `;
}

function d3_interpolateNumber(a, b) {
    return function(t) {
        return a + (b - a) * t;
    };
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
      // Taller aspect ratio for better vertical spacing
      setDimensions({ width, height: Math.max(500, width * 0.6) });
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
        <p className="text-sm text-slate-400 dark:text-slate-500">Add records to see the flow of funds</p>
      </div>
    );
  }

  // Interaction helpers
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
        className="relative overflow-visible rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
        style={{ width: '100%', height: dimensions.height }}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {links.map((link) => (
              <linearGradient
                key={`grad_${link.id}`}
                id={`grad_${link.id}`}
                gradientUnits="userSpaceOnUse"
                x1={link.sourceX}
                y1={0}
                x2={link.targetX}
                y2={0}
              >
                <stop offset="0%" stopColor={link.gradient[0]} />
                <stop offset="100%" stopColor={link.gradient[1]} />
              </linearGradient>
            ))}
          </defs>

          {links.map((link) => {
            const isHighlighted = highlightedIds
              ? highlightedIds.has(link.source) || highlightedIds.has(link.target)
              : false;
            // Opacity logic:
            // - No hover: 0.4
            // - Hover active & involved: 0.7
            // - Hover active & NOT involved: 0.1
            const opacity = hoveredId 
                ? (isHighlighted ? 0.7 : 0.1) 
                : 0.4;
            
            return (
              <path
                key={link.id}
                d={sankeyLinkPath(link)}
                fill={`url(#grad_${link.id})`}
                opacity={opacity}
                className="transition-all duration-300 ease-out"
                style={{ mixBlendMode: 'multiply' }} // Dark mode friendly blend? Maybe not for SVG
              />
            );
          })}
        </svg>

        {nodes.map((node) => {
          const isHovered = hoveredId === node.id;
          const isDimmed = hoveredId && !highlightedIds?.has(node.id);
          const textColor = getTextColor(node.color);

          return (
            <div
              key={node.id}
              className={`absolute flex flex-col justify-center rounded-xl p-3 shadow-sm transition-all duration-300 ${
                isDimmed ? 'opacity-30 grayscale' : 'opacity-100'
              } ${isHovered ? 'z-10 scale-105 shadow-xl ring-2 ring-white/20' : 'z-0 scale-100 hover:shadow-md'}`}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                backgroundColor: node.color,
              }}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="flex flex-col items-center text-center">
                 {/* Only show label if node is tall enough */}
                {node.height > 30 && (
                    <span 
                        className="truncate text-xs font-bold tracking-tight"
                        style={{ color: textColor }}
                    >
                        {node.label}
                    </span>
                )}
                {/* Only show value if node is very tall OR hampered */}
                {node.height > 50 && (
                    <span 
                        className="mt-0.5 text-[10px] opacity-90"
                        style={{ color: textColor }}
                    >
                        {formatCurrency(node.value, selectedCurrency, currencies)}
                    </span>
                )}
              </div>
              
              {/* Tooltip on hover (simple absolute position or native title) */}
              {isHovered && (
                 <div className="absolute left-1/2 top-[-40px] z-50 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl dark:bg-white dark:text-slate-900">
                    {node.label}: {formatCurrency(node.value, selectedCurrency, currencies)}
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-white"></div>
                 </div> 
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
