# AI Handoff: Chameleon Finance

This file is a practical snapshot for the next AI/dev to continue work quickly.

## 1. Project Snapshot

- Name: `chameleon-finance`
- Repo: `https://github.com/KunanonJ/chameleon-finance`
- Production: `https://chameleon-finance.pages.dev`
- Current branch: `main`
- Last known commit when this handoff was updated: `d3a1d15`
- Updated at: `2026-02-14 19:14 +07`

## 2. What the App Does

Chameleon has two main tabs:

1. `Finance Tracker` (default tab)
2. `Subscriptions`

### Finance Tracker
- Tracks records with fields like date, description, income, expenses, type, due date, payment info
- Shows summary cards and dashboard charts (bar, line, pie, area, treemap, sankey)
- Supports record icons:
  - Manual icon upload
  - Auto-detect icon domain from description (logo service)
- Includes `Clear All` with a two-step confirm interaction

### Subscriptions
- Tracks recurring subscriptions
- Has dashboard charts, budget indicator, trends, and renewal insights

## 3. Recent Product Behavior Changes

- Finance import now maps `Income` and `Expenses` by **header name**, not fixed index.
- Finance import supports header variants and typo variants (`Income Collumn`, `Expenses Collumn`).
- Finance import auto-detects header row (works when users add a title row above headers).
- Global button hover style now uses a card-like shadow feel.
- Buy Me a Coffee button exists in header near settings.

## 4. Core Tech and Commands

- React 19 + Vite 7
- Zustand for state
- Tailwind CSS v4
- Recharts for visualization
- Vitest for unit/integration
- Playwright for E2E
- Cloudflare Pages for deploy

### Local Commands

```bash
npm install
npm run dev
npm run build
npm test
npm run test:e2e
```

## 5. Testing Baseline

Latest verified baseline in this workspace:

- Vitest: `240/240` passing
- Playwright E2E: `54/54` passing

Important note:
- Jest is not the primary test runner here; tests are authored for Vitest + Playwright.

## 6. Important Files to Read First

- App shell and tab flow:
  - `src/App.jsx`
- Finance feature:
  - `src/features/finance/FinanceSection.jsx`
  - `src/features/finance/FinanceRecordModal.jsx`
  - `src/features/finance/FinanceRecordCard.jsx`
  - `src/features/finance/FinanceToolbar.jsx`
- Sheets sync:
  - `src/features/sync/sheetsApi.js`
  - `src/features/finance/useFinanceSheetsSync.js`
  - `src/features/sync/useSheetsSync.js`
- State:
  - `src/store/financeStore.js`
  - `src/store/subscriptionStore.js`
  - `src/store/settingsStore.js`
- Styling:
  - `src/index.css`

## 7. Data and Persistence

Main localStorage keys:

- `chameleon_finance_data` (finance records)
- `vexly_flow_data` (subscriptions + step/view + income)
- `subgrid_theme` (theme)
- `_sheets_config` (google sheet connection)
- `_sync_state`, `_finance_sync_state`, `_offline_queue` (sync metadata)

## 8. Google Sheets Integration Rules

### Generic Sync
- Uses public Google Sheets CSV endpoint (`gviz/tq?tqx=out:csv`)
- No Sheets API key
- Requires public sharing (`Anyone with the link can view`)

### Finance Import (`readFinancialRecords`)
- Header-based alias mapping
- Header-row auto detection
- Fallback index mapping retained for older templates
- Numeric parsing handles commas, symbols, and locale variants

Expected finance tab name: `Sheet1`

Finance template copy URL:
`https://docs.google.com/spreadsheets/d/1zhSnlIoqUSCkPMOCPT711rnsaIEDHhCjnBHixnBzXeo/copy`

## 9. Deployment Runbook (Cloudflare Pages)

Project name: `chameleon-finance`

```bash
npm run build
npx wrangler pages deploy dist --project-name=chameleon-finance --commit-dirty=true
```

Optional verification:

```bash
npx wrangler pages deployment list --project-name=chameleon-finance
```

## 10. Known Caveats

- `wrangler whoami` can intermittently fail locally, but deploy/list commands may still work.
- Vite build warns about large chunks; this is currently non-blocking.
- Repo remote may still show redirect from old repository name; push still works.

## 11. Suggested Next Improvements

1. Add explicit UI hint after finance sync when imported values are all zero (data-quality warning).
2. Add one more E2E for finance sheet import header variants.
3. Consider code-splitting charts to reduce bundle-size warning.
