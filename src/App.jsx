import { useState, useEffect, useMemo } from 'react';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useCurrencyStore } from '@store/currencyStore';
import { useTheme } from '@shared/hooks/useTheme';
import { formatCurrency } from '@shared/lib/currencies';
import { toMonthly } from '@shared/lib/currencies';

import SubscriptionList from '@features/subscriptions/SubscriptionList';
import AddSubscriptionModal from '@features/subscriptions/AddSubscriptionModal';
import PresetsGrid from '@features/presets/PresetsGrid';
import TreemapView from '@features/visualizations/TreemapView';
import BarView from '@features/visualizations/BarView';
import LineView from '@features/visualizations/LineView';
import PieView from '@features/visualizations/PieView';
import AreaView from '@features/visualizations/AreaView';
import SankeyView from '@features/visualizations/SankeyView';
import ViewToggle from '@features/visualizations/ViewToggle';
import BudgetIndicator from '@features/budget/BudgetIndicator';
import TrendsSection from '@features/trends/TrendsSection';
import UpcomingRenewals from '@features/reminders/UpcomingRenewals';
import SyncIndicator from '@features/sync/SyncIndicator';
import SettingsModal from '@features/settings/SettingsModal';
import FinanceSection from '@features/finance/FinanceSection';
import { useAutoSync } from '@features/sync/useAutoSync';

export default function App() {
  useTheme();
  useAutoSync();

  const subs = useSubscriptionStore((s) => s.subs);
  const step = useSubscriptionStore((s) => s.step);
  const setStep = useSubscriptionStore((s) => s.setStep);
  const currentView = useSubscriptionStore((s) => s.currentView);
  const setView = useSubscriptionStore((s) => s.setView);
  const initRates = useCurrencyStore((s) => s.initRates);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [preset, setPreset] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('finance');

  useEffect(() => {
    initRates();
  }, [initRates]);

  const handleEdit = (id) => {
    setEditId(id);
    setPreset(null);
    setModalOpen(true);
  };

  const handleOpenModal = () => {
    setEditId(null);
    setPreset(null);
    setModalOpen(true);
  };

  const handlePresetSelect = (p) => {
    setEditId(null);
    setPreset(p);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditId(null);
    setPreset(null);
  };

  const monthlyTotal = useMemo(() => {
    let total = 0;
    for (let i = 0; i < subs.length; i++) {
      total += toMonthly(subs[i], selectedCurrency, currencies);
    }
    return total;
  }, [subs, selectedCurrency, currencies]);

  const yearlyTotal = monthlyTotal * 12;

  const handleExportCSV = () => {
    let csv = 'Name,Price,Currency,Cycle,Category,Start Date,URL\n';
    for (const sub of subs) {
      csv += `"${sub.name}","${sub.price}","${sub.currency || ''}","${sub.cycle}","${sub.category || ''}","${sub.startDate || ''}","${sub.url || ''}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chameleon-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl dark:text-slate-100">Chameleon</h1>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-sm text-slate-400 dark:text-slate-500">Personal Finance Tracker</p>
            <SyncIndicator />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://www.buymeacoffee.com/fronk98"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt="Buy Me A Coffee"
              className="h-8"
            />
          </a>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 hover:shadow-md dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            aria-label="Settings"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            activeTab === 'finance'
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
          }`}
        >
          Finance Tracker
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
          }`}
        >
          Subscriptions
        </button>
      </div>

      {/* Finance Tracker Section */}
      {activeTab === 'finance' && <FinanceSection />}

      {/* Step 1: Subscription Management */}
      {activeTab === 'subscriptions' && step === 1 && (
        <div className="space-y-6">
          <SubscriptionList onEdit={handleEdit} onOpenModal={handleOpenModal} />

          {/* Presets */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Quick Add</h2>
            <PresetsGrid onSelect={handlePresetSelect} />
            <button
              onClick={handleOpenModal}
              className="w-full rounded-xl py-2 text-center text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            >
              Browse All Presets
            </button>
          </div>

          {/* Upcoming Renewals */}
          <UpcomingRenewals />

          {/* Next Button */}
          {subs.length > 0 && (
            <button
              onClick={() => setStep(2)}
              className="w-full rounded-2xl bg-indigo-600 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl"
            >
              View Dashboard
            </button>
          )}
        </div>
      )}

      {/* Step 2: Visualization Dashboard */}
      {activeTab === 'subscriptions' && step === 2 && (
        <div className="space-y-6">
          {/* Back + View Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <ViewToggle currentView={currentView} onViewChange={setView} />
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-medium text-slate-400 dark:text-slate-500">Monthly</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(monthlyTotal, selectedCurrency, currencies)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-medium text-slate-400 dark:text-slate-500">Yearly</div>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(yearlyTotal, selectedCurrency, currencies)}
              </div>
            </div>
          </div>

          {/* Visualization */}
          {currentView === 'bar' && <BarView />}
          {currentView === 'line' && <LineView />}
          {currentView === 'pie' && <PieView />}
          {currentView === 'area' && <AreaView />}
          {currentView === 'treemap' && <TreemapView />}
          {currentView === 'sankey' && <SankeyView />}

          {/* Budget */}
          <BudgetIndicator />

          {/* Trends */}
          <TrendsSection />

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      )}

      {/* Modals */}
      <AddSubscriptionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        editId={editId}
        preset={preset}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
