export const landingContent = {
  productName: 'Open Finance',
  edition: 'Public beta',
  eyebrow: 'Private money tracking, without the spreadsheet sprawl',
  heroTitle: 'A cleaner ledger for subscriptions, budgets, and the small decisions between paydays.',
  heroLead:
    'Open Finance is a local-first workspace for people who want to see recurring costs, imported transactions, budgets, and spending patterns without handing their whole financial life to another black box.',
  primaryCta: {
    label: 'Open app',
    href: '/app',
  },
  secondaryCta: {
    label: 'View health check',
    href: '/api/health',
  },
  stats: [
    { value: 'Local', label: 'data-first by default' },
    { value: 'Sheets', label: 'sync when you choose' },
    { value: 'D1 + R2', label: 'optional cloud backup' },
  ],
  proofPanels: [
    {
      title: 'Subscription pressure',
      metric: '$247.43',
      detail: 'Monthly recurring stack across tools, streaming, and storage.',
      trend: '3 renewals this week',
    },
    {
      title: 'Budget position',
      metric: '68%',
      detail: 'Used against the month with groceries and transport separated.',
      trend: '$412.80 left',
    },
    {
      title: 'Import queue',
      metric: '186',
      detail: 'Statement rows normalized before they touch the dashboard.',
      trend: 'CSV ready',
    },
  ],
  sections: [
    {
      label: '01',
      title: 'Local records stay readable.',
      copy:
        'Subscriptions, income, categories, budgets, and statement imports live in clear browser storage first. Export CSV or JSON whenever you need to move the data.',
    },
    {
      label: '02',
      title: 'Sync is optional, not a trap.',
      copy:
        'Connect Google Sheets for a familiar shared backup, or use the Cloudflare-backed endpoints when you want server-side copies.',
    },
    {
      label: '03',
      title: 'Dashboards explain tradeoffs.',
      copy:
        'Treemaps, Sankey views, trends, budgets, and renewal reminders make recurring spending visible before it becomes noise.',
    },
  ],
  workflow: [
    'Import a statement or add a subscription.',
    'Review categories, renewals, and budget pressure.',
    'Back up only when the data is ready to leave the device.',
  ],
};
