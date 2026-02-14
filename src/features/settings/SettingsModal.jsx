import { useCallback } from 'react';
import Modal from '@shared/ui/Modal';
import CurrencySelect from '@shared/ui/CurrencySelect';
import BudgetSettings from '@features/budget/BudgetSettings';
import ThemeToggle from '@features/settings/ThemeToggle';
import GoogleSheetsSettings from '@features/sync/GoogleSheetsSettings';
import { useCurrencyStore } from '@store/currencyStore';
import { useSubscriptionStore } from '@store/subscriptionStore';

export default function SettingsModal({ isOpen, onClose }) {
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const subs = useSubscriptionStore((s) => s.subs);
  const setSubs = useSubscriptionStore((s) => s.setSubs);
  const income = useSubscriptionStore((s) => s.income);
  const setIncome = useSubscriptionStore((s) => s.setIncome);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(subs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chameleon-export-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [subs]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (Array.isArray(imported)) {
            setSubs(imported);
          }
        } catch (err) {
          console.error('Failed to import:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setSubs]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">
        {/* Theme */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Appearance</label>
          <ThemeToggle />
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-700">Display Currency</label>
          <CurrencySelect value={selectedCurrency} onChange={setCurrency} className="w-full" />
        </div>

        {/* Monthly Income */}
        <div className="border-t border-slate-100 pt-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Monthly Income</label>
          <p className="mb-2 text-xs text-slate-400">Used in the Sankey diagram to show income vs expenses</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 5000"
              value={income || ''}
              onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-sm font-medium text-slate-500">{selectedCurrency}</span>
          </div>
        </div>

        {/* Budget */}
        <div className="border-t border-slate-100 pt-4">
          <BudgetSettings />
        </div>

        {/* Google Sheets */}
        <div className="border-t border-slate-100 pt-4">
          <GoogleSheetsSettings />
        </div>

        {/* Import / Export */}
        <div className="border-t border-slate-100 pt-4">
          <label className="mb-3 block text-sm font-semibold text-slate-700">Data</label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export JSON
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import JSON
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
