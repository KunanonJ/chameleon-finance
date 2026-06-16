# Chameleon Finance

Chameleon is a local-first finance and subscription tracker with optional cloud sync/backup, Google Sheets integration, and dashboard analytics.

- Production: [https://chameleon-finance.pages.dev](https://chameleon-finance.pages.dev)
- Stack: React 19, Vite 7, Zustand, Recharts, Cloudflare Pages Functions, D1, R2

## Quick Architecture Summary

The codebase is split into 4 main runtime layers:

1. **UI Layer (`src/features`, `src/shared/ui`)**
2. **State + Domain Logic Layer (`src/store`, `src/shared/lib`, feature hooks)**
3. **Sync/Integration Layer (Google Sheets + Cloud backup helpers)**
4. **Server Layer (`functions/api`) on Cloudflare Pages Functions**

Data flow is mostly:

`UI -> Zustand stores -> localStorage (persist) -> optional external sync/backup (Sheets/D1/R2)`

---

## Repository Map (What Lives Where)

```text
src/
  main.jsx                  # App bootstrap + Cloudflare analytics beacon injection
  App.jsx                   # Top-level app shell, tab routing, autosync/autobackup loops
  store/                    # Zustand stores (subscriptions, finance, currency, theme)
  features/                 # Product features (finance, subscriptions, sync, trends, budget, settings)
  shared/
    lib/                    # Pure/non-UI domain logic and helpers
    hooks/                  # Shared hooks (theme)
    ui/                     # Reusable UI primitives
functions/
  api/                      # Cloudflare Pages Function API routes
e2e/                        # Playwright end-to-end tests
d1/schema.sql               # D1 schema for push subscription/notification data
scripts/                    # Utility scripts (VAPID keys, statement PDF conversion)
```

---

## Frontend Architecture

### 1) Bootstrap and App Shell

#### `src/main.jsx`

- Mounts React root with `StrictMode`.
- Injects Cloudflare Analytics script when `VITE_CLOUDFLARE_ANALYTICS_TOKEN` exists.

#### `src/App.jsx`

Responsibilities:

- App-level composition for 2 primary surfaces:
  - **Finance Tracker**
  - **Subscriptions**
- Lazy-loads heavy sections/views for better initial load.
- Coordinates background jobs:
  - Auto Sheets sync every 5 minutes + on online/focus/visibility.
  - Auto cloud backup (debounced + interval + focus/visibility triggers).
- Owns modal states (`AddSubscriptionModal`, `SettingsModal`) and tab state.

Key design choice:

- `App` is intentionally orchestration-heavy; feature logic is delegated to hooks (`useSheetsSync`, `useFinanceSheetsSync`) and stores.

---

### 2) State Management (Zustand)

All state stores use `zustand` with persistence middleware and custom migration-safe storage handlers.

#### `src/store/subscriptionStore.js`

- State:
  - `subs`, `step`, `currentView`, `income`
- Actions:
  - `addSub`, `editSub`, `removeSub`, `setSubs`, `setStep`, `setView`, `setIncome`
- Persistence key:
  - `vexly_flow_data`
- Compatibility:
  - Supports legacy raw-array format and newer `{ subs, income }` format.

#### `src/store/financeStore.js`

- State:
  - `records`, `filters`
- Actions:
  - `addRecord`, `editRecord`, `removeRecord`, `setRecords`, `clearAll`, `setFilter`
- Persistence key:
  - `chameleon_finance_data`
- Compatibility:
  - Handles legacy array-only stored format.

#### `src/store/currencyStore.js`

- State:
  - `selectedCurrency`, `currencies`
- Actions:
  - `setCurrency`, `initRates`
- Runtime behavior:
  - Loads cached exchange rates.
  - Refreshes rates daily from `https://open.er-api.com/v6/latest/USD`.
  - Auto-detects first-visit currency via `ipapi.co`.
- Persistence key:
  - `vexly_currency` (stored as plain string for backward compatibility).

#### `src/store/settingsStore.js`

- State:
  - `theme` (`null` means follow system)
- Actions:
  - `setTheme`, `toggleTheme`, `getEffectiveTheme`
- Persistence key:
  - `subgrid_theme`

---

### 3) Theming

#### `src/shared/hooks/useTheme.js`

- Computes effective theme from user preference + system preference.
- Applies `data-theme="dark"` to `<html>` for Tailwind custom dark variant.
- Exposes:
  - `theme`, `isDark`, `toggleTheme`, `getChartColors`

#### `src/index.css`

- Tailwind v4 config + custom dark variant.
- Central CSS variables for text, border, chart colors, and shadow tokens.
- Includes custom rules for treemap, category UI, renewal badges, and global transitions.

---

## Feature Modules

### Subscriptions (`src/features/subscriptions`)

#### `AddSubscriptionModal.jsx`

- Create/edit subscription records.
- Auto category suggestion (`suggestCategory`) from subscription name.
- Icon resolution via logo proxy (`/api/logo/:domain`).
- Analytics events:
  - `subscription_added`
  - `subscription_edited`

#### `SubscriptionList.jsx` + `SubscriptionCard.jsx`

- List rendering and remove flow.
- Card-level domain display:
  - monthly normalization
  - category badge
  - renewal timing badge
  - logo fallback logic

### Finance (`src/features/finance`)

#### `FinanceSection.jsx`

- Two-step UI:
  - Step 1: record management
  - Step 2: dashboards
- Owns finance modal open/edit state.

#### `FinanceToolbar.jsx`

- CSV export
- Google Sheet template shortcut
- Statement upload/import (`.csv/.tsv/.txt`) with dedupe
- Finance pull sync from Sheets
- Safe clear-all with 2-step confirm

#### `FinanceRecordModal.jsx`

- Full finance record editor:
  - date, description, type, income/expense values
  - payment metadata
  - note + done state
  - icon domain/custom icon
  - color selection

#### `FinanceDashboard.jsx` and finance chart views

- Uses shared computations:
  - type breakdown
  - monthly trend
- Supports bar/line/pie/area/treemap/sankey rendering.

### Budget (`src/features/budget`)

#### `useBudget.js`

- Persists monthly budget (`subgrid_budget`) in localStorage.
- Computes usage %, threshold status, and status message.

#### `BudgetIndicator.jsx` + `BudgetSettings.jsx`

- Display + editor for budget limits with currency support.

### Trends (`src/features/trends`)

#### `useTrends.js`

- Tracks monthly snapshots in `subgrid_history`.
- Calculates:
  - month-over-month change
  - year-over-year change
  - trend direction (linear slope approximation)
- Exports trend history CSV.

#### `TrendsSection.jsx`

- UI cards for MoM/YoY + trend direction summary.
- Can force snapshot recording when history is sparse.

### Reminders (`src/features/reminders`)

#### `useReminders.js`

- Renewal date computation by cycle (weekly/monthly/yearly).
- Badge severity classes based on days to renewal.
- Upcoming-renewal extraction logic.

---

## Shared Domain Libraries (`src/shared/lib`)

### Finance and Import Utilities

#### `financeUtils.js`

- Record filtering
- Summary aggregation
- CSV export/import row parsing
- Breakdown by type
- Monthly trend generation

#### `bankStatementImport.js`

- Parses statement text from CSV-like formats.
- Delimiter detection + resilient amount/date parsing.
- Field alias mapping and type inference.
- Deduplication using fingerprint:
  - date + normalized description + income + expense

### Google Sheets Parsing

#### `features/sync/sheetsApi.js`

- Spreadsheet URL parsing and connection validation.
- Public CSV pull (no API key) for shared sheets.
- Reads tabs:
  - `Subscriptions`
  - `Budget`
  - `Trends`
  - finance tab (`gid` or fallback tab)
- Advanced finance import behavior:
  - header alias normalization
  - robust date/number/boolean parsing
  - monthly tab probing (`January 2026`, etc.)
  - merged/sorted cross-tab output

### Currency and Categories

#### `currencies.js`, `constants.js`, `categories.js`, `presets.js`

- Currency conversion + formatting helpers.
- Base currency catalog and locale mapping.
- Category catalog + keyword-based suggestion.
- Quick subscription presets.

### Visualization Layout Engines

#### `sankeyLayout.js`

- Custom 3-column Sankey layout:
  - Income -> Categories -> Subscriptions
- Produces explicit node/link geometry + bezier link paths.

#### `treemapLayout.js`

- Squarified treemap algorithm implementation.
- Computes rectangle tiling from weighted values.

### Cloud Backup Client Helpers

#### `serverStorage.js`

- Token validation + storage (`subgrid_server_token`)
- Cloudflare Access auth status probing (`/api/auth/me`)
- Backup/restore API client with endpoint fallback:
  - primary: `/api/db/backup`
  - fallback: `/api/r2/backup`
- Builds payload with subscriptions, finance records, budget, trends.

---

## Sync and Conflict Architecture

### Subscriptions Sync (`useSheetsSync.js`, `syncManager.js`)

- Pull-only from Google Sheets (read-oriented sync model).
- Merge strategy:
  - last-write-wins by `lastModified` for matching IDs
  - keeps unique records from both sides
- Conflict detection:
  - only flags near-simultaneous edits (within 60s) with differing payloads.

### Finance Sync (`useFinanceSheetsSync.js`)

- Uses Sheets credentials from shared config.
- Pulls finance records from:
  - explicit `gid` if URL contains it
  - otherwise `Sheet1` (`FINANCE_SHEET_TAB`)

### Offline Queue (`offlineQueue.js`)

- Tracks offline changes and retries.
- Currently geared to read-only cloud sync semantics (local queue bookkeeping + retry hooks).

---

## Storage Model (Client Side)

Primary localStorage keys:

- `vexly_flow_data` -> subscriptions + income + UI view state
- `chameleon_finance_data` -> finance records
- `subgrid_theme` -> explicit light/dark preference
- `vexly_currency` -> selected display currency
- `vexly_exchangeRates`, `vexly_ratesLastUpdate` -> cached FX data
- `_sheets_config` -> connected spreadsheet metadata
- `_sync_state`, `_finance_sync_state` -> sync timestamps
- `subgrid_budget` -> budget object
- `subgrid_history` -> monthly trend snapshots
- `subgrid_server_token` -> optional legacy backup token

---

## Backend Architecture (Cloudflare Pages Functions)

All APIs are in `functions/api`.

### Auth Core

#### `functions/api/_lib/auth.js`

- Accepts either:
  - explicit header token `X-User-Token` (64 hex chars), or
  - Cloudflare Access identity headers
- Cloudflare identity is normalized and hashed (SHA-256) into stable user token.

### Auth Status Endpoint

#### `GET /api/auth/me` (`functions/api/auth/me.js`)

- Returns whether Cloudflare Access identity is present.
- Supplies login/logout URLs (`/cdn-cgi/access/login`, `/cdn-cgi/access/logout`).

### D1 Backup Endpoint

#### `GET|POST /api/db/backup` (`functions/api/db/backup.js`)

- Uses `USER_DB` (preferred), fallback to `DB` / `ABDULL_DB`.
- Upserts JSON payload by user token in `user_backups`.
- Used as primary cloud backup backend.

### R2 Backup/Files Endpoints

#### Middleware: `functions/api/r2/_middleware.js`

- Enforces auth and R2 binding.
- Injects `data.userPrefix = users/<token>`.
- Adds CORS headers globally.

#### `GET|POST /api/r2/backup`

- Writes/reads latest backup and timestamped backup history in user namespace.

#### `GET /api/r2/backups`

- Lists historical backups for user.

#### `GET|POST /api/r2/exports`

- Save/list export files in `users/<token>/exports/`.

#### `GET|DELETE /api/r2/export/:filename`

- Download/delete a named export.

#### `GET|POST /api/r2/attachments/:subId`

- Upload/list subscription attachments (with MIME/type limits).

#### `GET|DELETE /api/r2/attachment/:subId/:filename`

- Download/delete one attachment.

### Other Server Endpoints

#### `GET /api/logo/:domain` (`functions/api/logo/[domain].js`)

- Domain-validated proxy to Logo.dev using `LOGO_DEV_API_TOKEN`.

#### `POST /api/event` (`functions/api/event.js`)

- Writes analytics datapoints to Cloudflare Analytics Engine binding `ANALYTICS`.

#### Legacy/utility endpoints

- `/api/health`, `/api/kv`, `/api/transactions`, `/api/r2` (older bindings and utility operations).

---

## Data Contracts

### Subscription Object

Common fields used across UI/store/sync:

- `id`, `name`, `price`, `currency`, `cycle`
- `category`, `color`
- `url`, `startDate`
- `notificationsEnabled`, `reminderDays`
- `lastModified`

### Finance Record Object

- `id`, `date`, `description`, `type`
- `income`, `expenses`, `minimumExpenses`
- `interestRate`, `balance`, `dueDate`
- `paymentMethod`, `howPaid`, `done`
- `note`, `iconDomain`, `customIcon`, `color`
- `lastModified`

---

## Build, Test, Deploy

### Local Development

```bash
git clone https://github.com/KunanonJ/abdull-finance.git
cd abdull-finance
npm install
npm run dev
```

Open `http://localhost:5173`.

### Test Commands

```bash
npm test
npm run test:e2e
```

### Build + Preview

```bash
npm run build
npm run preview
```

### Cloudflare Deploy (Pages)

Production is deployed on Cloudflare Pages under the GoGoCash Cloudflare account
(`187ab61ed9dbc6e616cb23e6b95aa8f1`).

- Project: `chameleon-finance`
- Production URL: `https://chameleon-finance-c4y.pages.dev`
- Production branch: `main`
- D1 database: `chameleon-finance-db` (`5c279de4-9b53-455c-af95-6ca173b42d4f`)
- R2 bucket: `subgrid-storage`
- Analytics Engine dataset: `subgrid_events`

```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=187ab61ed9dbc6e616cb23e6b95aa8f1 npx wrangler pages deploy dist --project-name=chameleon-finance --branch main
```

Verify the deployment:

```bash
curl https://chameleon-finance-c4y.pages.dev/api/health
```

---

## Config Files and Infra Notes

### `vite.config.js`

- Aliases:
  - `@`, `@features`, `@shared`, `@store`
- Manual chunk split:
  - `vendor-charts` for `recharts`
  - `vendor` for other `node_modules`

### `vitest.config.js`

- JSDOM test environment
- setup file: `src/test/setup.js`
- test include: `src/**/*.{test,spec}.{js,jsx}`

### Wrangler configs

- `wrangler.jsonc` (current Pages-oriented config):
  - `ANALYTICS`, `R2_BUCKET`, `USER_DB`
- `wrangler.toml` (compatibility mirror for local/CLI workflows):
  - `ANALYTICS`, `R2_BUCKET`, `USER_DB`

The code resolves modern binding names first and keeps legacy `ABDULL_*` fallbacks for older
utility endpoints.

---

## Mobile and Native Shell

- iOS/Android are wrapped with Capacitor (`appId: com.chameleon.app`). The native `ios/` and `android/` projects are **not committed** — run `cap:sync` to generate them from `dist/`.
- Relevant scripts in `package.json`:
  - `cap:sync`
  - `cap:ios`
  - `cap:android`

---

## Practical Extension Guide (How to Develop Faster)

### Add a new feature safely

1. Create feature files under `src/features/<feature>`.
2. Keep data logic in `src/shared/lib` or feature hooks.
3. Keep store mutations centralized in `src/store/*`.
4. Add unit tests next to new logic (`*.test.js`).
5. If feature touches external data, add/extend API route in `functions/api`.

### Add a new chart/view

1. Build selector/aggregation in shared lib (`financeUtils.js` or feature hook).
2. Create view component in:
   - `src/features/visualizations` (subscription charts), or
   - `src/features/finance` (finance charts).
3. Register view in `ViewToggle` and in parent dashboard switch logic.

### Add a new server endpoint

1. Create file under `functions/api/...`.
2. Reuse auth helpers from `functions/api/_lib/auth.js`.
3. Return consistent JSON and CORS headers.
4. Add binding checks (`env.<binding>`) and explicit 501/500 fallback messages.

---

## Runtime Bindings Checklist

Expected bindings/env vars used by current code:

- `LOGO_DEV_API_TOKEN`
- `R2_BUCKET`
- D1 backup binding: `USER_DB` (preferred), or `DB`, or `ABDULL_DB`
- `ANALYTICS` (for `/api/event`)

Optional legacy endpoints may also use:

- `ABDULL_KV`
- `ABDULL_BUCKET`

---

## Key Files to Start Reading

If you are onboarding, read these first in order:

1. `src/App.jsx`
2. `src/store/subscriptionStore.js`
3. `src/store/financeStore.js`
4. `src/features/sync/sheetsApi.js`
5. `src/shared/lib/serverStorage.js`
6. `functions/api/_lib/auth.js`
7. `functions/api/db/backup.js`

This sequence gives you the fastest path to understanding app flow, data lifecycle, and server integration boundaries.
