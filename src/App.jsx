import { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { useSubscriptionStore } from '@store/subscriptionStore';
import { useFinanceStore } from '@store/financeStore';
import { useCurrencyStore } from '@store/currencyStore';
import { useTheme } from '@shared/hooks/useTheme';
import { formatCurrency } from '@shared/lib/currencies';
import { toMonthly } from '@shared/lib/currencies';
import { PRODUCT_BRAND, getDatedExportFilename } from '@shared/lib/productBranding';
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
import { useSheetsSync } from '@features/sync/useSheetsSync';
import { useFinanceSheetsSync } from '@features/finance/useFinanceSheetsSync';
import OpenFinanceLanding from '@features/landing/OpenFinanceLanding';

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
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
    <div className="rounded-xl border-[0.5px] border-foreground/15 bg-card px-4 py-6 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function FinanceApp() {
  useTheme();

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
  const { isConnected: isSheetsConnected, pull: pullSheets } = useSheetsSync();
  const { pullFinance } = useFinanceSheetsSync();
  const isAutoSyncingRef = useRef(false);
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
    let cancelled = false;

    const runAutoSync = async () => {
      if (cancelled || isAutoSyncingRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (!isSheetsConnected()) return;

      isAutoSyncingRef.current = true;
      try {
        await Promise.all([
          pullSheets(),
          pullFinance(),
        ]);
      } catch (err) {
        console.warn('Auto sync failed:', err);
      } finally {
        isAutoSyncingRef.current = false;
      }
    };

    // Initial background pull when app loads (if connected)
    runAutoSync();

    const intervalId = window.setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);
    const onOnline = () => runAutoSync();
    const onFocus = () => runAutoSync();
    const onVisibilityChange = () => {
      if (!document.hidden) runAutoSync();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isSheetsConnected, pullSheets, pullFinance]);

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
    link.download = getDatedExportFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="of-app-shell">
      <div className="of-app-rail of-app-rail--left" aria-hidden="true">Aegean ledger / Bangkok</div>
      <div className="of-app-rail of-app-rail--right" aria-hidden="true">Open Finance / private agora</div>

      <div className="of-app-topbar">
        <div className="of-app-container of-app-topbar__inner">
          <span><span className="of-app-pulse" aria-hidden="true" /><b>Open Finance</b> / App <em>OF / 2026</em></span>
          <span className="of-app-topbar__mid"><span>Bangkok</span><span>Aegean ledger</span><span>Local-first</span></span>
          <span className="of-app-topbar__right"><span>Private by default</span><span>MMXXVI</span></span>
        </div>
      </div>

      <div className="of-app-container">
        <header className="of-app-nav">
          <a className="of-app-brand" href="/" aria-label="Open Finance landing page">
            <span>
              <span className="of-app-brand__name">Open <em>Finance</em></span>
              <span className="of-app-brand__meta"><b>Greek ledger</b>local-first</span>
            </span>
          </a>

          <nav className="of-app-nav-links" aria-label="Customer app ledger sections">
            <a href="#app-workspace">Ledger <span>local</span></a>
            <a href="#app-workspace">Budgets <span>live</span></a>
            <a href="#app-workspace">Imports <span>csv</span></a>
            <a href="#app-workspace">Sync <span>opt-in</span></a>
            <a href="#app-workspace">Privacy <span>device</span></a>
          </nav>

          <div className="of-app-actions">
            <a
              className="of-app-support"
              href="https://www.buymeacoffee.com/fronk98"
              target="_blank"
              rel="noopener noreferrer"
            >
              Support
            </a>
            <button
              onClick={() => setSettingsOpen(true)}
              className="of-app-settings"
              aria-label="Settings"
            >
              <span>Settings</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        <div className="of-app-rule" aria-hidden="true">
          <span>I.</span>
          <span><span>Customer app</span><span>·</span><span>Private money workspace</span></span>
          <span>001 / 003</span>
        </div>

        <main className="of-app-workspace" id="app-workspace" aria-label="Open Finance app workspace">
          <section className="of-app-intro" aria-labelledby="open-finance-app-title">
            <div>
              <p className="of-app-kicker">Inside the workspace / column and coin</p>
              <h1 id="open-finance-app-title">{PRODUCT_BRAND.name}</h1>
              <p className="of-app-display-subtitle">Private ledger workspace<span>.</span></p>
              <p className="of-app-summary">
                A calm, columned surface for cashflow, recurring spend, imports, sync state, and cloud archives.
              </p>
            </div>
            <div className="of-app-sync">
              <SyncIndicator />
            </div>
          </section>

          <section className="of-app-window" aria-label="Open Finance product window">
            <div className="of-app-window__bar">
              <span className="of-app-window__dots" aria-hidden="true"><i /><i /><i /></span>
              <span>open-finance.local / attic ledger</span>
            </div>

            <nav className="of-app-tabs" aria-label="App sections">
              <div className="of-app-tablist" role="tablist" aria-label="Finance workspace modules">
                <button
                  type="button"
                  role="tab"
                  onClick={() => setActiveTab('finance')}
                  aria-label="Finance Tracker"
                  aria-controls="of-app-panel"
                  aria-selected={activeTab === 'finance'}
                  className={activeTab === 'finance' ? 'is-active' : ''}
                >
                  Finance Tracker <span className="of-app-status of-app-status--good" aria-hidden="true">live</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  onClick={() => setActiveTab('subscriptions')}
                  aria-label="Subscriptions"
                  aria-controls="of-app-panel"
                  aria-selected={activeTab === 'subscriptions'}
                  className={activeTab === 'subscriptions' ? 'is-active' : ''}
                >
                  Subscriptions <span className="of-app-status" aria-hidden="true">local</span>
                </button>
              </div>
            </nav>

            <div className="of-app-panel" id="of-app-panel" role="tabpanel">
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
                    <h2 className="text-sm font-semibold text-muted-foreground">Quick Add</h2>
                    <PresetsGrid onSelect={handlePresetSelect} />
                    <button
                      onClick={handleOpenModal}
                      className="w-full rounded-xl py-2 text-center text-xs font-medium text-[var(--water-text)] transition-colors hover:bg-secondary"
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
                      className="w-full rounded-full bg-foreground py-3.5 font-bold text-background transition-colors hover:opacity-90"
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
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                    <div className="rounded-xl border-[0.5px] border-foreground bg-card p-4">
                      <div className="text-xs font-medium text-muted-foreground">Monthly</div>
                      <div className="text-xl font-bold tabular-nums text-foreground">
                        {formatCurrency(monthlyTotal, selectedCurrency, currencies)}
                      </div>
                    </div>
                    <div className="rounded-xl border-[0.5px] border-foreground bg-card p-4">
                      <div className="text-xs font-medium text-muted-foreground">Yearly</div>
                      <div className="text-xl font-bold tabular-nums text-foreground">
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
                    className="flex w-full items-center justify-center gap-2 rounded-full border-[0.5px] border-foreground py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                  </button>
                </div>
              )}
            </div>

            <div className="of-app-window__review" aria-hidden="true">
              <span>Attic register mode</span>
              <span className="of-app-status of-app-status--good">portable</span>
            </div>
          </section>

          <section className="of-app-method" aria-label="Customer app method">
            <article>
              <img src="/open-design-assets/method-1.png" alt="" aria-hidden="true" />
              <div>
                <p>01</p>
                <h2>Keep it local</h2>
              </div>
            </article>
            <article>
              <img src="/open-design-assets/method-2.png" alt="" aria-hidden="true" />
              <div>
                <p>02</p>
                <h2>Normalize imports</h2>
              </div>
            </article>
            <article>
              <img src="/open-design-assets/method-3.png" alt="" aria-hidden="true" />
              <div>
                <p>03</p>
                <h2>Show the money map</h2>
              </div>
            </article>
          </section>
        </main>
      </div>

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

export default function App() {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname;
  const shouldShowApp = pathname === PRODUCT_BRAND.appPath;

  if (shouldShowApp) {
    return <FinanceApp />;
  }

  return <OpenFinanceLanding />;
}
