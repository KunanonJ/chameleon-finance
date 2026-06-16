export const FINANCE_TYPES = [
  { id: 'Income', label: 'Income', color: '#22c55e' },
  { id: 'Utility', label: 'Utility', color: '#3b82f6' },
  { id: 'Loan', label: 'Loan', color: '#f97316' },
  { id: 'Credit Card', label: 'Credit Card', color: '#ef4444' },
];

export const PAYMENT_METHODS = [
  'Token Deposit',
  'Bank Transfer',
];

export const HOW_PAID_OPTIONS = [
  'Minimum Payment',
  'Full Payment',
];

export const FINANCE_TEMPLATE_ID = '1zhSnlIoqUSCkPMOCPT711rnsaIEDHhCjnBHixnBzXeo';
export const FINANCE_TEMPLATE_COPY_URL = `https://docs.google.com/spreadsheets/d/${FINANCE_TEMPLATE_ID}/copy`;
export const FINANCE_SHEET_TAB = 'Sheet1';
export const FINANCE_MONTH_TABS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getTypeColor(typeId) {
  const t = FINANCE_TYPES.find((ft) => ft.id === typeId);
  return t ? t.color : '#64748b';
}

export function getTypeLabel(typeId) {
  const t = FINANCE_TYPES.find((ft) => ft.id === typeId);
  return t ? t.label : typeId || 'Other';
}
