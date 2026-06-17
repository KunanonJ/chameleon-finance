export const PRODUCT_BRAND = {
  name: 'Open Finance',
  shortName: 'Open Finance',
  tagline: 'Local-first finance and subscription tracking',
  description:
    'Track subscriptions, budgets, spending, dashboards, Google Sheets sync, and optional Cloudflare backup in one private finance workspace.',
  appPath: '/app',
  landingPath: '/',
  exportPrefix: 'open-finance',
};

export function getDatedExportFilename(date = new Date(), scope = '') {
  const datePart = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const suffix = scope ? `-${scope}` : '';
  return `${PRODUCT_BRAND.exportPrefix}${suffix}-${datePart}.csv`;
}

export function getDatedJsonExportFilename(date = new Date(), scope = 'export') {
  const datePart = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  return `${PRODUCT_BRAND.exportPrefix}-${scope}-${datePart}.json`;
}
