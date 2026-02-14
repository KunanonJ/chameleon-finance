# Chameleon -- AI Handoff Document

> **Purpose**: Give any AI assistant full context to continue working on this project seamlessly. Read this before making changes.

## Project Identity

| Key | Value |
|-----|-------|
| **Name** | Chameleon |
| **Repo** | `https://github.com/KunanonJ/chameleon-finance` |
| **Production** | `chameleon-finance.pages.dev` (Cloudflare Pages) |
| **Local dev** | `http://localhost:5173` (Vite dev server) |
| **Description** | Personal finance tracker -- subscriptions + financial records, with visualizations, Google Sheets sync, and mobile support |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI | React | 19 |
| Charts | Recharts | 2 |
| Build | Vite | 7 |
| Styling | Tailwind CSS | v4 (via `@tailwindcss/vite` plugin) |
| State | Zustand | 5 (with persist middleware) |
| Mobile | Capacitor | 8 (iOS + Android) |
| Unit Testing | Vitest + React Testing Library | 4 |
| E2E Testing | Playwright | 1.58 |
| Icons | Iconify (`@iconify/react`) | 6 |
| Hosting | Cloudflare Pages + Workers + R2 | -- |
| Sync | Google Sheets (public CSV export, no API key) | -- |

---

## Architecture Overview

### Folder Structure Pattern

Feature-based organization under `src/features/`, shared code under `src/shared/`, stores under `src/store/`.

### Component Hierarchy

```
App.jsx (tab router: Finance Tracker | Subscriptions)
├── Finance Tab (default, step 1: records, step 2: dashboard)
│   ├── FinanceSummary (4 summary cards)
│   ├── FinanceToolbar (Export, Template, Sync)
│   ├── FinanceList (type/date filters → FinanceRecordCard[])
│   │   └── FinanceRecordCard (clickable, color bar, custom icon)
│   ├── Dashboard (step 2)
│   │   ├── ViewToggle
│   │   └── FinanceBarView / FinanceLineView / FinancePieView / FinanceAreaView / FinanceTreemapView / FinanceSankeyView
│   └── FinanceRecordModal (icon upload, color picker, all finance fields)
├── Subscriptions Tab (step 1: list, step 2: dashboard)
│   ├── SubscriptionList → SubscriptionCard[]
│   ├── PresetsGrid (quick-add)
│   ├── Dashboard (step 2)
│   │   ├── ViewToggle
│   │   ├── BarView / LineView / PieView / AreaView / TreemapView / SankeyView
│   │   ├── BudgetIndicator
│   │   ├── TrendsSection
│   │   └── UpcomingRenewals
│   └── AddSubscriptionModal
├── SettingsModal (theme, currency, income, budget, Sheets, import/export)
└── SyncIndicator (pulsing status: synced/syncing/error/offline)
```

### State Flow

- **Zustand stores** (persisted to localStorage) hold all application state
- **Container components** read from stores, pass data down as props
- **Presentational components** receive props, fire callbacks upward
- **Custom hooks** (`useBudget`, `useReminders`, `useTrends`) encapsulate domain logic

---

## Data Models

### Subscription

```js
{
  id: string,                    // auto-generated (Date.now + random)
  name: string,
  price: number,
  currency: string,              // e.g. 'USD', 'THB'
  cycle: 'Weekly' | 'Monthly' | 'Yearly',
  url: string,                   // optional, used for logo fetch
  color: string,                 // color ID from constants
  category: string,              // entertainment, productivity, health, education, utilities, other
  startDate: string,             // ISO date
  notificationsEnabled: boolean,
  reminderDays: number,
  lastModified: string           // ISO datetime
}
```

### Finance Record

```js
{
  id: string,                    // Date.now() + random suffix
  date: string,                  // ISO date (set via todayLocal() helper)
  description: string,
  interestRate: number,
  income: number,
  expenses: number,
  minimumExpenses: number,
  balance: number,
  dueDate: string,               // ISO date, optional
  paymentMethod: string,         // 'Token Deposit' | 'Bank Transfer'
  howPaid: string,               // 'Minimum Payment' | 'Full Payment'
  done: boolean,
  type: string,                  // 'Income' | 'Utility' | 'Loan' | 'Credit Card'
  note: string,
  color: string,                 // color ID from constants (12-color palette)
  customIcon: string,            // base64 data URL (max 100px, auto-resized)
  iconDomain: string,            // domain for logo.dev auto-detection
  lastModified: string           // ISO datetime
}
```

---

## State Management (Zustand Stores)

### 1. `useSubscriptionStore` -- `src/store/subscriptionStore.js`

| Field | Type | Description |
|-------|------|-------------|
| `subs` | array | All subscriptions |
| `step` | 1 \| 2 | List (1) vs dashboard (2) |
| `currentView` | string | Active visualization type |
| `income` | number | Monthly income (for Sankey) |

**localStorage key**: `vexly_flow_data`
**Methods**: `addSub`, `editSub`, `removeSub`, `setSubs`, `clearAll`, `setStep`, `setView`, `setIncome`
**Note**: Handles legacy format migration (raw array to object with income)

### 2. `useFinanceStore` -- `src/store/financeStore.js`

| Field | Type | Description |
|-------|------|-------------|
| `records` | array | All finance records |
| `filters` | object | `{ type: 'all', dateRange: 'all' }` |

**localStorage key**: `chameleon_finance_data`
**Methods**: `addRecord`, `editRecord`, `removeRecord`, `setRecords`, `clearAll`, `setFilter`
**Note**: ID generation uses `Date.now() + Math.random().toString(36).slice(2, 8)` to prevent duplicates

### 3. `useCurrencyStore` -- `src/store/currencyStore.js`

| Field | Type | Description |
|-------|------|-------------|
| `selectedCurrency` | string | Active currency code |
| `currencies` | object | `{ [code]: { symbol, name, rate } }` |

**localStorage key**: `vexly_currency`
**Additional keys**: `vexly_exchangeRates`, `vexly_ratesLastUpdate`, `vexly_geoCurrencyDetected`
**Methods**: `setCurrency`, `initRates`
**Features**: 24-hour rate cache, IP geolocation for auto-detection, fallback to hardcoded rates
**APIs**: `open.er-api.com` (rates), `ipapi.co` (geolocation)

### 4. `useSettingsStore` -- `src/store/settingsStore.js`

| Field | Type | Description |
|-------|------|-------------|
| `theme` | string \| null | `'light'`, `'dark'`, or null (system) |

**localStorage key**: `subgrid_theme`
**Methods**: `setTheme`, `toggleTheme`, `getEffectiveTheme`

---

## Google Sheets Sync

### How It Works

1. User shares a Google Sheet as "Anyone with the link can view"
2. App fetches CSV via `https://docs.google.com/spreadsheets/d/{id}/gviz/tq?tqx=out:csv&sheet={tab}`
3. No API key required -- uses public CSV export endpoint
4. Data is parsed client-side and merged with local state

### Sync Architecture

| File | Role |
|------|------|
| `src/features/sync/sheetsApi.js` | CSV fetcher, parser, credential storage |
| `src/features/sync/syncManager.js` | Merge logic, conflict detection, pull orchestration |
| `src/features/sync/offlineQueue.js` | Queue changes when offline, retry up to 3 times |
| `src/features/sync/useSheetsSync.js` | React hook for subscription sync |
| `src/features/finance/useFinanceSheetsSync.js` | React hook for finance sync |

### Conflict Resolution

- **Strategy**: Last-write-wins by `lastModified` timestamp
- **Conflict window**: If both local and cloud modified within 60 seconds, user chooses
- **Sheet tabs read**: `Subscriptions`, `Budget`, `Trends`, `Sheet1` (finance)

### Credential Storage

localStorage key: `_sheets_config` stores `{ spreadsheetId, sheetsUrl, connectedAt }`

---

## Finance Feature Details

### Finance Types

```js
[
  { id: 'Income',      color: '#22c55e' },  // green
  { id: 'Utility',     color: '#3b82f6' },  // blue
  { id: 'Loan',        color: '#f97316' },  // orange
  { id: 'Credit Card', color: '#ef4444' },  // red
]
```

### Dropdown Options

- **Payment Method**: `Token Deposit`, `Bank Transfer`
- **How I paid**: `Minimum Payment`, `Full Payment`

### Google Sheets Template

- Template ID: `1zhSnlIoqUSCkPMOCPT711rnsaIEDHhCjnBHixnBzXeo`
- Copy URL: `https://docs.google.com/spreadsheets/d/{id}/copy`
- Sheet tab name: `Sheet1`

### Summary Computation (`financeUtils.js`)

Computes from filtered records:
- `totalIncome` -- sum of all `income` fields
- `totalExpenses` -- sum of all `expenses` fields
- `totalMinimumExpenses` -- sum of all `minimumExpenses` fields
- `netBalance` -- `totalIncome - totalExpenses`

### Filtering

- **By type**: All, Income, Utility, Loan, Credit Card
- **By date range**: All Time, This Month, Last Month, This Year

---

## Visualizations

### Recharts-Based Views (Bar, Line, Pie, Area)

All 4 Recharts views follow a consistent pattern using the shared `Chart.jsx` components:

1. Data from Zustand stores → `useMemo` for computation
2. `ChartContainer` wraps a Recharts `ResponsiveContainer` with styled card
3. `ChartTooltipContent` provides themed tooltips
4. `ChartLegendContent` provides themed legends
5. CSS variables (`--chart-1` through `--chart-5`) for theme-aware chart colors

**Shared chart file**: `src/shared/ui/Chart.jsx` -- `ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`

### Custom Views (Treemap, Sankey)

The treemap and Sankey views use custom layout algorithms:

1. `useRef` for container element
2. `useState` for responsive dimensions
3. `useEffect` with `ResizeObserver` for auto-resize
4. `useMemo` for expensive layout computation
5. Absolute-positioned elements rendered from layout data

### Layout Algorithms (in `src/shared/lib/`)

| File | Algorithm |
|------|-----------|
| `treemapLayout.js` | Squarified treemap (rectangular subdivisions by cost) |
| `sankeyLayout.js` | Flow diagram: income → categories → subscriptions |

---

## Key Patterns

### Dark Mode

- Tailwind `dark:` variant classes throughout all components
- Theme applied via `[data-theme="dark"]` attribute on `<html>` element
- Custom variant defined as `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`
- System preference respected when theme is null
- Chart colors use CSS variables (`--chart-1` through `--chart-5`) with separate light/dark values

### Modal Pattern

```jsx
// Parent manages state
const [modalOpen, setModalOpen] = useState(false);
const [editId, setEditId] = useState(null);

// Pass to modal
<Modal isOpen={modalOpen} onClose={handleClose} editId={editId} />

// Inside modal: populate form from store when editId is set
useEffect(() => {
  if (editId) { /* load existing record */ }
  else if (isOpen) { /* reset to defaults */ }
}, [editId, isOpen]);
```

### Currency Conversion

- All conversions go through USD as base: `amount / fromRate * toRate`
- `toMonthly(sub, currency, currencies)` normalizes any subscription to monthly in target currency
- Cycle conversion: Weekly x 4.33, Yearly / 12

### Form Input Classes (reused constants in modal files)

```js
const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200';
const selectClass = 'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200';
const labelClass = 'mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300';
```

### Path Aliases (vite.config.js)

```js
'@'        → 'src/'
'@features' → 'src/features/'
'@shared'   → 'src/shared/'
'@store'    → 'src/store/'
```

---

## Complete File Map

```
src/
  main.jsx                                # React entry point
  App.jsx                                 # Root component (tab nav + views)
  index.css                               # Tailwind CSS + custom styles

  store/
    subscriptionStore.js                  # Subs CRUD, income, step, view
    financeStore.js                       # Finance records CRUD, filters
    currencyStore.js                      # Currency, exchange rates, IP detection
    settingsStore.js                      # Theme toggle, persistence
    financeStore.test.js                  # 14 tests
    settingsStore.test.js                 # 14 tests

  features/
    subscriptions/
      SubscriptionList.jsx                # Card list container
      SubscriptionCard.jsx                # Individual card with logo, renewal badge
      AddSubscriptionModal.jsx            # Add/edit form with category auto-suggest

    finance/
      FinanceSection.jsx                  # Main finance container (record list + dashboard)
      FinanceSummary.jsx                  # 4 summary cards (income/expenses/min/net)
      FinanceToolbar.jsx                  # Export CSV, Template, Sync buttons
      FinanceList.jsx                     # Filtered record list with type/date filters
      FinanceRecordCard.jsx               # Clickable card with color bar + custom icon
      FinanceRecordModal.jsx              # Add/edit form (icon upload, color picker, all fields)
      FinanceTreemapView.jsx              # Finance treemap visualization
      FinanceBarView.jsx                  # Finance bar chart (Recharts)
      FinanceLineView.jsx                 # Finance line chart (Recharts)
      FinancePieView.jsx                  # Finance pie/donut chart (Recharts)
      FinanceAreaView.jsx                 # Finance area chart (Recharts)
      FinanceSankeyView.jsx               # Finance 3-column Sankey (income → expenses → breakdown)
      useFinanceSheetsSync.js             # Finance-specific Sheets sync hook

    budget/
      BudgetIndicator.jsx                 # Progress bar (safe/warning/caution/danger)
      BudgetSettings.jsx                  # Budget amount input
      useBudget.js                        # Budget logic + thresholds
      useBudget.test.js                   # 22 tests
      budget-integration.test.js          # Integration tests

    reminders/
      UpcomingRenewals.jsx                # Renewals within 30 days
      useReminders.js                     # Renewal date calculation
      useReminders.test.js                # 22 tests

    trends/
      TrendsSection.jsx                   # MoM/YoY dashboard
      useTrends.js                        # Trend analysis + CSV export
      useTrends.test.js                   # 24 tests
      trends-edge-cases.test.js           # Edge case coverage

    visualizations/
      TreemapView.jsx                     # Treemap chart
      BarView.jsx                         # Bar chart (Recharts)
      LineView.jsx                        # Line chart (Recharts)
      PieView.jsx                         # Pie/donut chart (Recharts)
      AreaView.jsx                        # Area chart (Recharts)
      SankeyView.jsx                      # Sankey flow diagram
      ViewToggle.jsx                      # Visualization type switcher

    settings/
      SettingsModal.jsx                   # Theme, currency, income, budget, Sheets, data
      ThemeToggle.jsx                     # Dark/light toggle

    presets/
      PresetsGrid.jsx                     # Quick-add subscription templates

    sync/
      sheetsApi.js                        # Google Sheets CSV reader
      syncManager.js                      # Merge + conflict detection
      offlineQueue.js                     # Offline change queue + retry
      useSheetsSync.js                    # Subscription sync hook
      GoogleSheetsSettings.jsx            # Sheets connection UI
      SyncIndicator.jsx                   # Sync status badge
      sheetsApi.test.js                   # 17 tests
      syncManager.test.js                 # 10 tests
      offlineQueue.test.js                # 14 tests
      sheets-e2e.test.js                  # 28 tests (full sync flows)

  shared/
    ui/
      Modal.jsx                           # Base modal (backdrop, escape, scroll lock)
      ColorPicker.jsx                     # 12-color grid picker
      CurrencySelect.jsx                  # Currency dropdown
      Chart.jsx                           # Recharts wrapper (ChartContainer, ChartTooltipContent, ChartLegendContent)

    hooks/
      useTheme.js                         # Theme application to <html>

    lib/
      constants.js                        # Colors, logo API, default currencies
      financeConstants.js                 # Finance types, payment methods, template
      financeUtils.js                     # Summary, filtering, CSV export/import
      categories.js                       # Category definitions + auto-detection
      currencies.js                       # Formatting + conversion utilities
      utils.js                            # escapeHtml, extractDomain, cleanName
      presets.js                          # Preset subscription templates
      analytics.js                        # Client-side event tracking
      csvParser.js                        # CSV parsing utilities
      treemapLayout.js                    # Treemap layout algorithm
      sankeyLayout.js                     # Sankey layout algorithm
      -- test files --
      categories.test.js                  # 21 tests
      financeUtils.test.js                # 19 tests
      utils.test.js, dom-safety.test.js, price-validation.test.js,
      storage-errors.test.js, rates-error.test.js, xss.test.js

  test/
    setup.js                              # Vitest setup (localStorage mock)

e2e/
  app.spec.js                             # 28 subscription E2E tests
  finance.spec.js                         # 26 finance + tab E2E tests
```

---

## Testing

### Commands

```bash
npm test          # Unit tests (Vitest) -- 238 tests across 18 suites
npm run test:watch  # Watch mode
npm run test:e2e  # E2E tests (Playwright) -- 54 tests across 2 suites
```

### Vitest Config

- Environment: `jsdom`
- Setup file: `src/test/setup.js` (mocks localStorage)
- Test pattern: `src/**/*.{test,spec}.{js,jsx}`
- Path aliases match vite.config.js

### Playwright Config

- Test directory: `./e2e`
- Base URL: `http://localhost:4173` (Vite preview)
- Web server: `npm run preview` on port 4173
- Retries: 2 in CI, 0 locally

### E2E Helper Pattern

```js
// finance.spec.js uses a scoped helper with requestSubmit() to avoid
// viewport/scroll issues with the tall finance form modal
async function addFinanceRecord(page, { description, type, income, expenses }) {
  await page.click('button:has-text("Add Record")');
  await expect(page.getByRole('heading', { name: 'Add Record' })).toBeVisible();
  const form = page.locator('form');
  // Wait for React useEffect to set the date field before filling
  await page.waitForFunction(
    () => document.querySelector('input[type="date"]')?.value !== '',
    { timeout: 3000 }
  );
  await form.locator('input[placeholder="..."]').fill(description);
  if (type) await form.locator('select').first().selectOption(type);
  if (income) await form.locator('input[placeholder="0"]').nth(0).fill(String(income));
  if (expenses) await form.locator('input[placeholder="0"]').nth(1).fill(String(expenses));
  await form.evaluate((f) => f.requestSubmit());  // bypasses scroll/viewport issues
  await expect(page.getByRole('heading', { name: 'Add Record' })).not.toBeVisible();
}
```

**Important E2E lessons:**
- The finance modal form is taller than `max-h-[90vh]` at 720px viewport (default). The submit button gets clipped by `overflow-y: auto`. Use `form.requestSubmit()` instead of clicking the button.
- Wait for `input[type="date"]` to have a value before filling other fields. The `todayLocal()` date is set via `useEffect` which runs after the first render. Filling fields before the state update causes a stale closure to overwrite the date with `''`, making HTML5 validation reject the submit.
- Use functional state updates `setForm(prev => ({ ...prev, ... }))` to avoid stale closures in onChange handlers.

---

## Deployment

### Cloudflare Pages

- **Project name**: `chameleon-finance`
- **Subdomain**: `chameleon-finance.pages.dev`
- **Build output**: `dist/` (Vite)
- **Wrangler config**: `wrangler.jsonc`

### Manual Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=chameleon-finance
```

### CI/CD (GitHub Actions)

File: `.github/workflows/ci.yml`

1. **Test job**: `npm ci` → `npm test` → `npm run build` (Node 20, ubuntu-latest)
2. **Deploy job**: On `main` push only, deploys `dist/` to Cloudflare Pages

**Required secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

### Cloudflare Bindings

| Binding | Type | Name |
|---------|------|------|
| `ANALYTICS` | Analytics Engine | `subgrid_events` |
| `R2_BUCKET` | R2 Storage | `subgrid-storage` |

---

## All localStorage Keys

| Key | Store/Feature | Data |
|-----|--------------|------|
| `vexly_flow_data` | subscriptionStore | Subscriptions, step, view, income |
| `chameleon_finance_data` | financeStore | Finance records |
| `vexly_currency` | currencyStore | Selected currency |
| `vexly_exchangeRates` | currencyStore | Cached exchange rates |
| `vexly_ratesLastUpdate` | currencyStore | Rate cache timestamp |
| `vexly_geoCurrencyDetected` | currencyStore | Flag: IP detection done |
| `subgrid_theme` | settingsStore | Theme preference |
| `subgrid_budget` | useBudget | Budget amount + currency |
| `subgrid_history` | useTrends | Spending snapshots (24 months max) |
| `_sheets_config` | sheetsApi | Google Sheets connection |
| `_sync_state` | syncManager | Last sync timestamps |
| `_offline_queue` | offlineQueue | Pending offline changes |
| `_finance_sync_state` | useFinanceSheetsSync | Finance sync timestamps |

---

## Development History (Key Milestones)

| Commit | Description |
|--------|-------------|
| `00b72b6` | Initial commit -- vanilla JS subscription tracker |
| `0a4d489` | Migrated from vanilla JS to React + Vite + Capacitor |
| `ea283d3` | Added Sankey diagram and IP-based currency detection |
| `c878897` | Rebranded SubGrid to Chameleon |
| `500e64f` | Fixed dark mode across all components |
| `bf49369` | Added Financial Tracker (Phase 1-4), tab nav, Sheets sync, E2E tests |
| `2732b9f` | Updated payment/how-paid options to fixed dropdowns |
| `36caa6c` | Added brand icons, Finance Tracker as main tab, clear all, logo, CI fixes |
| `85ae52c` | Fixed BMC button CDN image and E2E tests |
| `ca40fd3` | Added View Dashboard to Finance Tracker with breakdown charts |
| `e8e0e4d` | Added Treemap, Beeswarm, Circles, and Sankey views to Finance Dashboard |
| `6891fa2` | Redesigned Finance Sankey to 3-column layout with expense breakdown |
| `47db69c` | Made finance record cards clickable to open edit modal |
| -- | Migrated visualizations from custom Beeswarm/CirclePack to Recharts (Bar, Line, Pie, Area) |
| -- | Redesigned logo to mint green (#00CC99) with friendlier chameleon design |

---

## Current State (as of 2026-02-14)

- All features implemented and deployed to production
- 238 unit tests + 54 E2E tests passing
- Production build: ~717 KB (gzip: ~210 KB) -- includes Recharts library
- Finance Tracker is the default/primary tab
- Both dashboards have 6 visualization types: Bar (default), Line, Pie/Donut, Area, Treemap, Sankey
- Bar, Line, Pie, Area views powered by Recharts; Treemap and Sankey use custom layout algorithms
- Chart theming via CSS variables (`--chart-1` through `--chart-5`) with light/dark variants
- Shared chart components in `src/shared/ui/Chart.jsx` (ChartContainer, ChartTooltipContent, ChartLegendContent)
- Brand color: mint green (#00CC99) -- logo, theme-color, PWA manifest
- Finance Sankey uses 3-column layout: Total Income → Total Expenses → Expense breakdown + Net Balance
- Finance records support custom icon upload (base64) and 12-color picker
- Sankey node text colors adapt to background luminance for readability in light/dark mode
- All interactive elements have hover shadow effects
- Sync indicator pulses with animate-pulse animation
- Google Sheets sync works for both subscriptions and finance records
- Dark mode works across all components including charts and Sankey text
- Mobile support via Capacitor (iOS + Android)
- Date field uses `todayLocal()` helper for timezone-correct local date (not UTC)

---

## Tips for Continuing Work

1. **Run tests before and after changes**: `npm test && npm run build`
2. **E2E tests require a build first**: `npm run build && npm run test:e2e`
3. **Use path aliases**: `@features/`, `@shared/`, `@store/` instead of relative paths
4. **Dark mode**: Always add `dark:` variant classes to new UI elements
5. **Sankey text**: Use luminance-based text color computation (see `getTextColor()` in `FinanceSankeyView.jsx`) for text on colored backgrounds
6. **New finance types**: Add to `FINANCE_TYPES` in `financeConstants.js`, update filter pills in `FinanceList.jsx`
7. **New stores**: Follow Zustand persist pattern with custom storage handler (see `financeStore.js`)
8. **Selectors in E2E tests**: Scope within `page.locator('form')` when testing modals to avoid ambiguity
9. **Form submission in E2E**: Use `form.evaluate(f => f.requestSubmit())` instead of clicking submit buttons in modals (see "E2E Helper Pattern" above)
10. **React onChange handlers**: Use functional updates `setForm(prev => ...)` to prevent stale closures from overwriting concurrent state updates
11. **Date handling**: Use local date (`getFullYear/getMonth/getDate`) not `toISOString().split('T')[0]` which returns UTC date (wrong for UTC+ timezones)
12. **Deploy**: `npm run build && npx wrangler pages deploy dist --project-name=chameleon-finance --branch=main --commit-dirty=true`
