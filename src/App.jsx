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
import BeeswarmView from '@features/visualizations/BeeswarmView';
import CirclePackView from '@features/visualizations/CirclePackView';
import SankeyView from '@features/visualizations/SankeyView';
import ViewToggle from '@features/visualizations/ViewToggle';
import BudgetIndicator from '@features/budget/BudgetIndicator';
import TrendsSection from '@features/trends/TrendsSection';
import UpcomingRenewals from '@features/reminders/UpcomingRenewals';
import SyncIndicator from '@features/sync/SyncIndicator';
import SettingsModal from '@features/settings/SettingsModal';
import FinanceSection from '@features/finance/FinanceSection';

export default function App() {
  useTheme();

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
            className="flex items-center gap-1.5 rounded-full bg-[#FFDD00] px-3 py-1.5 text-xs font-bold text-[#000000] shadow-sm transition-all hover:shadow-md hover:brightness-105"
          >
            <svg className="h-4 w-4" viewBox="0 0 884 1279" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M791.109 297.518L790.231 297.002L788.201 296.383C789.018 297.072 790.04 297.472 791.109 297.518Z" fill="#0D0C22"/>
              <path d="M803.896 388.891L802.916 389.166L803.896 388.891Z" fill="#0D0C22"/>
              <path d="M791.109 297.518C791.164 297.518 791.219 297.518 791.273 297.518C791.164 297.472 791.109 297.518 791.109 297.518Z" fill="#0D0C22"/>
              <path d="M124.263 132.381C124.263 132.381 141.484 52.424 218.822 30.24C218.822 30.24 235.023 25.14 259.621 22.247C284.22 19.353 311.861 24.94 311.861 24.94C414.465 46.087 449.488 150.744 449.488 150.744L462.34 200.019H122.528L124.263 132.381Z" fill="#FFDD00"/>
              <path d="M791.109 297.518C789.924 297.373 788.779 296.994 787.735 296.401L786.068 295.734C786.068 295.734 538.153 207.373 450.396 150.744C450.396 150.744 440.479 97.199 386.156 62.151C331.833 27.103 256.9 24.795 233.077 25.723C209.254 26.651 124.263 44.559 117.007 132.381C109.751 220.202 109.751 220.202 109.751 220.202H462.459L791.109 297.518Z" fill="#FFDD00"/>
              <path d="M803.896 388.891C803.896 388.891 818.879 312.032 791.109 297.518C791.109 297.518 609.093 245.022 462.459 220.202L109.751 220.202C109.751 220.202 85.153 234.716 82.26 282.078C79.367 329.44 73.58 369.282 82.26 402.943C90.94 436.604 102.264 476.445 102.264 476.445C102.264 476.445 109.751 508.764 148.861 508.764C187.971 508.764 422.08 508.764 422.08 508.764L803.896 388.891Z" fill="#FFDD00"/>
              <path d="M262.524 508.764C262.524 508.764 230.205 508.764 219.802 537.577C209.398 566.39 197.191 624.276 197.191 624.276C197.191 624.276 193.527 655.253 217.899 679.218C242.271 703.183 277.037 703.183 277.037 703.183H425.111L457.43 508.764H262.524Z" fill="#FFDD00"/>
              <path d="M425.111 703.183H277.037C277.037 703.183 245.623 703.183 231.109 716.775C216.596 730.367 197.191 781.727 197.191 781.727L170.286 863.019C170.286 863.019 157.175 907.175 186.694 938.567C216.213 969.959 242.271 969.959 275.932 969.959C275.932 969.959 418.358 977.11 452.019 940.028C485.68 902.946 485.68 869.285 485.68 869.285V508.764H457.43L425.111 703.183Z" fill="#FFDD00"/>
              <path d="M451.076 1011.07C451.076 1011.07 446.842 1055.23 446.842 1076.18C446.842 1097.13 444.654 1145.58 480.079 1171.64C515.504 1197.7 555.901 1196.78 555.901 1196.78H607.261C649.559 1196.78 678.622 1167.72 678.622 1125.42V1011.07H451.076Z" fill="#FFDD00"/>
            </svg>
            Buy me a coffee
          </a>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
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
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            activeTab === 'finance'
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          Finance Tracker
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
            activeTab === 'subscriptions'
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
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
          {currentView === 'treemap' && <TreemapView />}
          {currentView === 'beeswarm' && <BeeswarmView />}
          {currentView === 'circlepack' && <CirclePackView />}
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
