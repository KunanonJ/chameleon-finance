/**
 * Sankey diagram layout algorithm
 * 3-column layout: Income → Categories → Subscriptions
 */

const CATEGORY_COLORS = {
  entertainment: '#E5DEFF',
  productivity: '#C6F6F6',
  health: '#FFDCC2',
  education: '#FFF4C3',
  utilities: '#E0E7FF',
  other: '#F1F5F9',
};

const CATEGORY_LABELS = {
  entertainment: 'Entertainment',
  productivity: 'Productivity',
  health: 'Health & Fitness',
  education: 'Education',
  utilities: 'Utilities',
  other: 'Other',
};

export class SankeyLayout {
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.nodeWidth = width * (options.nodeWidthRatio || 0.12);
    this.nodePadding = options.nodePadding || 8;
    this.columnPositions = options.columnPositions || [0.05, 0.44, 0.83];
  }

  layout(income, subscriptions, toMonthlyFn) {
    if (subscriptions.length === 0) return { nodes: [], links: [] };

    // Group subs by category and compute monthly values
    const categoryMap = {};
    let totalExpenses = 0;

    for (const sub of subscriptions) {
      const cat = sub.category || 'other';
      const monthly = toMonthlyFn(sub);
      if (!categoryMap[cat]) {
        categoryMap[cat] = { subs: [], total: 0 };
      }
      categoryMap[cat].subs.push({ ...sub, monthly });
      categoryMap[cat].total += monthly;
      totalExpenses += monthly;
    }

    // If no income set, use total expenses as the scale reference
    const effectiveIncome = Math.max(income, totalExpenses);
    if (effectiveIncome === 0) return { nodes: [], links: [] };

    const remaining = Math.max(0, income - totalExpenses);
    const categories = Object.entries(categoryMap).sort((a, b) => b[1].total - a[1].total);

    const nodes = [];
    const links = [];

    // Available height for nodes (leave padding top and bottom)
    const topPadding = 10;
    const availableHeight = this.height - topPadding * 2;

    // Column X positions
    const col0X = this.width * this.columnPositions[0];
    const col1X = this.width * this.columnPositions[1];
    const col2X = this.width * this.columnPositions[2];

    // --- LEFT COLUMN: Income node ---
    const incomeNode = {
      id: '_income',
      label: 'Income',
      value: effectiveIncome,
      x: col0X,
      y: topPadding,
      width: this.nodeWidth,
      height: availableHeight,
      color: '#6366f1',
      column: 0,
    };
    nodes.push(incomeNode);

    // --- MIDDLE COLUMN: Category nodes ---
    // Calculate heights proportional to value
    const catPaddingTotal = Math.max(0, (categories.length + (remaining > 0 ? 1 : 0) - 1)) * this.nodePadding;
    const catAvailableHeight = availableHeight - catPaddingTotal;

    let catY = topPadding;
    const categoryNodes = [];

    for (const [catId, catData] of categories) {
      const h = Math.max(16, (catData.total / effectiveIncome) * catAvailableHeight);
      const node = {
        id: `_cat_${catId}`,
        label: CATEGORY_LABELS[catId] || catId,
        value: catData.total,
        x: col1X,
        y: catY,
        width: this.nodeWidth,
        height: h,
        color: CATEGORY_COLORS[catId] || '#F1F5F9',
        column: 1,
      };
      nodes.push(node);
      categoryNodes.push({ node, catId, catData });
      catY += h + this.nodePadding;
    }

    // Remaining node in middle column
    let remainingNode = null;
    if (remaining > 0 && income > 0) {
      const h = Math.max(16, (remaining / effectiveIncome) * catAvailableHeight);
      remainingNode = {
        id: '_remaining',
        label: 'Remaining',
        value: remaining,
        x: col1X,
        y: catY,
        width: this.nodeWidth,
        height: h,
        color: '#86efac',
        column: 1,
      };
      nodes.push(remainingNode);
    }

    // --- RIGHT COLUMN: Subscription nodes ---
    // For each category, lay out its subs vertically aligned with the category node
    const subNodes = [];

    for (const { node: catNode, catData } of categoryNodes) {
      const subs = catData.subs.sort((a, b) => b.monthly - a.monthly);
      const subPaddingTotal = Math.max(0, subs.length - 1) * (this.nodePadding / 2);
      const subAvailableHeight = catNode.height - subPaddingTotal;

      let subY = catNode.y;

      for (const sub of subs) {
        const h = Math.max(12, (sub.monthly / catData.total) * subAvailableHeight);
        const subNode = {
          id: sub.id,
          label: sub.name,
          value: sub.monthly,
          x: col2X,
          y: subY,
          width: this.nodeWidth,
          height: h,
          color: sub.color || CATEGORY_COLORS[sub.category || 'other'],
          column: 2,
        };
        nodes.push(subNode);
        subNodes.push({ subNode, catId: sub.category || 'other' });
        subY += h + this.nodePadding / 2;
      }
    }

    // --- LINKS: Income → Categories ---
    let incomeYOffset = topPadding;
    for (const { node: catNode } of categoryNodes) {
      const linkHeight = (catNode.value / effectiveIncome) * availableHeight;
      links.push({
        source: '_income',
        target: catNode.id,
        value: catNode.value,
        sourceX: col0X + this.nodeWidth,
        sourceY: incomeYOffset,
        sourceHeight: linkHeight,
        targetX: col1X,
        targetY: catNode.y,
        targetHeight: catNode.height,
        color: catNode.color,
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
        sourceX: col0X + this.nodeWidth,
        sourceY: incomeYOffset,
        sourceHeight: linkHeight,
        targetX: col1X,
        targetY: remainingNode.y,
        targetHeight: remainingNode.height,
        color: remainingNode.color,
      });
    }

    // --- LINKS: Categories → Subscriptions ---
    for (const { node: catNode, catData } of categoryNodes) {
      const subs = catData.subs.sort((a, b) => b.monthly - a.monthly);
      let catYOffset = catNode.y;

      for (const sub of subs) {
        const subNode = nodes.find((n) => n.id === sub.id);
        if (!subNode) continue;

        const linkHeight = (sub.monthly / catData.total) * catNode.height;
        links.push({
          source: catNode.id,
          target: sub.id,
          value: sub.monthly,
          sourceX: col1X + this.nodeWidth,
          sourceY: catYOffset,
          sourceHeight: linkHeight,
          targetX: col2X,
          targetY: subNode.y,
          targetHeight: subNode.height,
          color: catNode.color,
        });
        catYOffset += linkHeight;
      }
    }

    return { nodes, links };
  }
}

/**
 * Generate SVG path for a Sankey link (bezier curve)
 */
export function linkPath(link) {
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
