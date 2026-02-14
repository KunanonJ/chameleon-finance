# Chameleon Finance

Chameleon is a personal finance web app for tracking subscriptions and day-to-day financial records in one place.

- Production: [https://chameleon-finance.pages.dev](https://chameleon-finance.pages.dev)
- Stack: React + Vite + Zustand + Tailwind + Recharts
- Data storage: Browser `localStorage` (client-side)

## Features

### Finance Tracker
- Add and manage financial records (Income, Utility, Loan, Credit Card)
- Summary cards for total income, expenses, minimum expenses, and net balance
- Dashboard views: Bar, Line, Pie/Donut, Area, Treemap, Sankey
- Line chart optimized for monthly overview (last 12 months, including zero-value months)
- Brand icon support on records (auto-detect via domain/logo API)
- Google Sheets finance import with header-based mapping
- Clear All button with two-click confirmation

### Subscription Tracker
- Add/edit/delete subscriptions with category, cycle, and currency
- Dashboard with charts and Sankey flow
- Line chart optimized for monthly overview (last 12 months)
- Budget indicator and trends
- Renewal reminders
- Preset quick-add cards

### UX and Platform
- Light/Dark theme
- Hover card shadow on interactive buttons
- Google Sheets sync support
- Auto Google Sheets sync (on app start, every 5 minutes, and when back online/focused)
- iOS/Android support via Capacitor

## Quick Start

```bash
git clone https://github.com/KunanonJ/chameleon-finance.git
cd chameleon-finance
npm install
npm run dev
```

Open `http://localhost:5173`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run Vitest unit/integration tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run cap:sync` | Sync web build to Capacitor |
| `npm run cap:ios` | Open iOS project |
| `npm run cap:android` | Open Android project |

## Testing

Current baseline:
- Vitest: `242/242` passing
- Playwright E2E: `54/54` passing

Run locally:

```bash
npm test
npm run test:e2e
```

## Google Sheets Sync

No API key is required. Sheets must be shared as **Anyone with the link can view**.

### Auto Sync Behavior
- Runs automatically when connected:
  - on app load
  - every 5 minutes in background
  - when network is restored (`online`)
  - when window/tab returns to focus
- Manual sync button is still available in the UI.

### Subscription/Budget/Trend Tabs
Create tabs named exactly:
- `Subscriptions`
- `Budget`
- `Trends`

### Finance Import
- Finance sync uses the connected sheet URL tab:
  - if URL contains `gid=...`, it syncs that tab
  - otherwise it falls back to `Sheet1`
- Recommended template copy URL:
  - [https://docs.google.com/spreadsheets/d/1zhSnlIoqUSCkPMOCPT711rnsaIEDHhCjnBHixnBzXeo/copy](https://docs.google.com/spreadsheets/d/1zhSnlIoqUSCkPMOCPT711rnsaIEDHhCjnBHixnBzXeo/copy)
- Import rules:
  - Header-based mapping (not strict fixed column index)
  - Auto-detects header row (supports title rows above header)
  - Explicitly maps `Income` and `Expenses` by column name
  - Supports header variants like `Interested Rate`, `How I paid?`, `Done?`
  - Supports common typos like `Income Collumn` and `Expenses Collumn`
  - Parses formatted numbers (commas, currency symbols, localized formats)

## Deployment

Cloudflare Pages project: `chameleon-finance`

```bash
npm run build
npx wrangler pages deploy dist --project-name=chameleon-finance --commit-dirty=true
```

## Project Structure

```text
src/
  App.jsx
  store/                    # Zustand stores
  features/
    finance/                # Finance records + finance dashboard
    subscriptions/          # Subscriptions flow
    sync/                   # Google Sheets integration
    budget/ reminders/ trends/
    visualizations/         # Chart views
    settings/ presets/
  shared/
    lib/ ui/ hooks/
  test/

e2e/                        # Playwright tests
public/                     # Icons, manifest, static assets
```

## Notes

- This repo uses **Vitest** for unit/integration tests (not Jest by default).
- Production domain is tied to the Cloudflare Pages project name.
