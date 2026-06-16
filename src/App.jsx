import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { useTheme } from '@shared/hooks/useTheme';
import { formatCurrency } from '@shared/lib/currencies';
import { toMonthly } from '@shared/lib/currencies';
import {
  backupToServer,
  buildServerPayload,
  getCloudAuthStatus,
  getServerToken,
  isValidServerToken,
} from '@shared/lib/serverStorage';

import SubscriptionList from '@features/subscriptions/SubscriptionList';
import PresetsGrid from '@features/presets/PresetsGrid';
import ViewToggle from '@features/visualizations/ViewToggle';
import BudgetIndicator from '@features/budget/BudgetIndicator';
import UpcomingRenewals from '@features/reminders/UpcomingRenewals';
import SyncIndicator from '@features/sync/SyncIndicator';
import { useAutoSync } from '@features/sync/useAutoSync';

const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const AUTO_BACKUP_DEBOUNCE_MS = 1500;
const AddSubscriptionModal = lazy(() => import('@features/subscriptions/AddSubscriptionModal'));
const SettingsModal = lazy(() => import('@features/settings/SettingsModal'));
const FinanceSection = lazy(() => import('@features/finance/FinanceSection'));
const TreemapView = lazy(() => import('@features/visualizations/TreemapView'));
const BarView = lazy(() => import('@features/visualizations/BarView'));
const LineView = lazy(() => import('@features/visualizations/LineView'));
const PieView = lazy(() => import('@features/visualizations/PieView'));
const AreaView = lazy(() => import('@features/visualizations/AreaView'));
const SankeyView = lazy(() => import('@features/visualizations/SankeyView'));
const TrendsSection = lazy(() => import('@features/trends/TrendsSection'));

function SectionLoader({ label = 'Loading...' }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
      {label}
    </div>
  );
}

export default function App() {
  useTheme();
  useAutoSync();

  const subs = useSubscriptionStore((s) => s.subs);
  const income = useSubscriptionStore((s) => s.income);
  const step = useSubscriptionStore((s) => s.step);
  const setStep = useSubscriptionStore((s) => s.setStep);
  const currentView = useSubscriptionStore((s) => s.currentView);
  const setView = useSubscriptionStore((s) => s.setView);
  const records = useFinanceStore((s) => s.records);
  const initRates = useCurrencyStore((s) => s.initRates);
  const selectedCurrency = useCurrencyStore((s) => s.selectedCurrency);
  const currencies = useCurrencyStore((s) => s.currencies);
  const autoBackupDataRef = useRef({ subs: [], records: [], income: 0 });
  const autoBackupTimeoutRef = useRef(null);
  const lastAutoBackupPayloadRef = useRef('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [preset, setPreset] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('finance');
  const [localDataTick, setLocalDataTick] = useState(0);

  useEffect(() => {
    initRates();
  }, [initRates]);

  useEffect(() => {
    autoBackupDataRef.current = { subs, records, income };
  }, [subs, records, income]);

  useEffect(() => {
    const onLocalDataChanged = () => setLocalDataTick((v) => v + 1);
    window.addEventListener('subgrid:data-changed', onLocalDataChanged);
    return () => window.removeEventListener('subgrid:data-changed', onLocalDataChanged);
  }, []);

  const runAutoCloudBackup = async () => {
    const token = getServerToken();
    let requestToken = '';
    if (isValidServerToken(token)) {
      requestToken = token;
    } else {
      const cloudAuth = await getCloudAuthStatus();
      if (!cloudAuth.authenticated) return;
    }

    const currentData = autoBackupDataRef.current;
    const payload = buildServerPayload({
      subscriptions: currentData.subs,
      financeRecords: currentData.records,
      income: currentData.income,
    });

    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload === lastAutoBackupPayloadRef.current) return;

    try {
      await backupToServer(requestToken, payload);
      lastAutoBackupPayloadRef.current = serializedPayload;
    } catch (err) {
      console.warn('Auto cloud backup failed:', err);
    }
  };

  useEffect(() => {
    window.clearTimeout(autoBackupTimeoutRef.current);
    autoBackupTimeoutRef.current = window.setTimeout(() => {
      runAutoCloudBackup();
    }, AUTO_BACKUP_DEBOUNCE_MS);

    return () => window.clearTimeout(autoBackupTimeoutRef.current);
  }, [subs, records, income, localDataTick]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      runAutoCloudBackup();
    }, AUTO_BACKUP_INTERVAL_MS);

    const onFocus = () => runAutoCloudBackup();
    const onVisibilityChange = () => {
      if (!document.hidden) runAutoCloudBackup();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

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
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl dark:text-slate-100">Chameleon</h1>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-sm text-muted-foreground">Finance and subscription tracker</p>
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
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700 hover:shadow-md dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
          }`}
        >
          Finance Tracker
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
            activeTab === 'subscriptions'
              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
              : 'text-slate-500 hover:bg-white/50 hover:text-slate-700 hover:shadow-md dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
          }`}
        >
          Subscriptions
        </button>
      </div>

      {/* Finance Tracker Section */}
      {activeTab === 'finance' && (
        <Suspense fallback={<SectionLoader label="Loading finance tracker..." />}>
          <FinanceSection />
        </Suspense>
      )}

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

          <Suspense fallback={<SectionLoader label="Loading dashboard..." />}>
            {/* Visualization */}
            {currentView === 'bar' && <BarView />}
            {currentView === 'line' && <LineView />}
            {currentView === 'pie' && <PieView />}
            {currentView === 'area' && <AreaView />}
            {currentView === 'treemap' && <TreemapView />}
            {currentView === 'sankey' && <SankeyView />}
          </Suspense>

          {/* Budget */}
          <BudgetIndicator />

          <Suspense fallback={<SectionLoader label="Loading trends..." />}>
            {/* Trends */}
            <TrendsSection />
          </Suspense>

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
      <Suspense fallback={null}>
        {modalOpen && (
          <AddSubscriptionModal
            isOpen={modalOpen}
            onClose={handleCloseModal}
            editId={editId}
            preset={preset}
          />
        )}
        {settingsOpen && (
          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </Suspense>
    </div>
  );
}
