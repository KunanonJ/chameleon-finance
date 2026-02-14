# Chameleon

A subscription cost tracker and visualizer built with React. See where your money goes each month through interactive treemaps, beeswarm charts, circle packs, and Sankey diagrams -- with optional Google Sheets sync and mobile support via Capacitor.

## Features

- **Subscription Tracking** -- Add, edit, and delete subscriptions with price, currency, billing cycle, and category
- **Visual Dashboards** -- Treemap, beeswarm, circle pack, and Sankey diagram views of your spending
- **Sankey Diagram** -- Income flow visualization showing how money flows from income through categories to individual subscriptions
- **Budget Alerts** -- Set monthly budget limits with threshold warnings (safe / warning / caution / danger)
- **Categories** -- Auto-categorize subscriptions (entertainment, productivity, health, education, utilities)
- **Renewal Reminders** -- Notifications for upcoming renewals with configurable lead time
- **Spending Trends** -- Month-over-month and year-over-year analysis with CSV export
- **Dark Mode** -- System-aware theme toggle with persistence
- **Google Sheets Sync** -- Pull subscription data from a public Google Sheet with conflict resolution
- **Offline Support** -- Changes queued locally and replayed when connectivity returns
- **Multi-Currency** -- 38+ currencies with live exchange rates and IP-based auto-detection
- **Export** -- Save data as JSON or CSV
- **Mobile** -- iOS and Android support via Capacitor

## Quick Start

```bash
git clone https://github.com/KunanonJ/abdull-finance.git
cd abdull-finance
npm install
npm run dev
```

Open `http://localhost:5173`. All data is stored in your browser's localStorage.

### Build for production

```bash
npm run build
npm run preview   # Preview the production build locally
```

## Google Sheets Sync

Chameleon can pull data from a public Google Sheet. No API key needed.

### Sheet Setup

1. Create a Google Sheet with three tabs named exactly: `Subscriptions`, `Budget`, `Trends`
2. Share the sheet as **"Anyone with the link can view"**

**Subscriptions tab** (row 1 = headers):

| ID | Name | Price | Currency | Cycle | Category | StartDate | Notifications | ReminderDays | URL | Color | LastModified |
|----|------|-------|----------|-------|----------|-----------|---------------|--------------|-----|-------|--------------|
| sub1 | Netflix | 15.99 | USD | Monthly | entertainment | 2025-01-01 | true | 7 | netflix.com | red | 2025-01-01T00:00:00Z |

**Budget tab** (row 1 = headers):

| Amount | Currency | LastModified |
|--------|----------|--------------|
| 100 | USD | 2025-01-01T00:00:00Z |

**Trends tab** (row 1 = headers):

| Month | Total | SubscriptionCount | Currency | LastModified |
|-------|-------|-------------------|----------|--------------|
| 2025-01 | 85.50 | 5 | USD | 2025-02-01T00:00:00Z |

### Connecting

1. Open Chameleon settings panel
2. Paste your Google Sheet URL
3. Click **Connect**
4. Use **Sync Now** to pull the latest data

Conflict resolution uses last-write-wins by timestamp. If both local and cloud versions were modified within 60 seconds, a dialog lets you choose which to keep.

## Project Structure

```
src/
  main.jsx                          # React entry point
  App.jsx                           # Root component (step 1/2 views)
  index.css                         # Tailwind CSS + custom styles
  store/
    subscriptionStore.js            # Zustand store (subs CRUD, income, persistence)
    currencyStore.js                # Zustand store (currency, exchange rates, IP detection)
    settingsStore.js                # Zustand store (theme, persistence)
  features/
    subscriptions/
      SubscriptionList.jsx          # Subscription card list
      SubscriptionCard.jsx          # Individual subscription card
      AddSubscriptionModal.jsx      # Add/edit subscription form modal
    budget/
      BudgetIndicator.jsx           # Dashboard budget progress bar
      BudgetSettings.jsx            # Budget amount settings UI
      useBudget.js                  # Budget logic (get/set/thresholds)
    reminders/
      UpcomingRenewals.jsx          # Upcoming renewal list
      useReminders.js               # Renewal calculation logic
    trends/
      TrendsSection.jsx             # Trends dashboard section
      useTrends.js                  # Trend analysis (MoM, YoY, export)
    visualizations/
      TreemapView.jsx               # Treemap chart
      BeeswarmView.jsx              # Beeswarm chart
      CirclePackView.jsx            # Circle pack chart
      SankeyView.jsx                # Sankey diagram (income flow)
      ViewToggle.jsx                # Visualization switcher
    settings/
      SettingsModal.jsx             # Settings modal (theme, currency, income, budget)
      ThemeToggle.jsx               # Dark/light mode toggle
    presets/
      PresetsGrid.jsx               # Quick-add preset grid
    sync/
      GoogleSheetsSettings.jsx      # Sheets connection UI
      SyncIndicator.jsx             # Sync status indicator
      sheetsApi.js                  # Google Sheets CSV reader
      syncManager.js                # Sync orchestration + conflict resolution
      offlineQueue.js               # Offline change queue with retry
      useSheetsSync.js              # Sheets sync hook
  shared/
    ui/
      Modal.jsx                     # Reusable modal component
      ColorPicker.jsx               # Color picker component
      CurrencySelect.jsx            # Currency dropdown component
    hooks/
      useTheme.js                   # Theme application hook
    lib/
      categories.js                 # Category definitions + auto-detection
      currencies.js                 # Currency formatting + conversion
      constants.js                  # Colors, logo API config
      presets.js                    # Preset subscription templates
      utils.js                     # escapeHtml, extractDomain, etc.
      analytics.js                 # Client analytics
      csvParser.js                 # CSV parsing utilities
      treemapLayout.js             # Treemap layout algorithm
      beeswarmLayout.js            # Beeswarm layout algorithm
      circlepackLayout.js          # Circle pack layout algorithm
      sankeyLayout.js              # Sankey diagram layout algorithm
  test/
    setup.js                       # Vitest setup (localStorage mock, etc.)
e2e/
  app.spec.js                       # Playwright E2E tests (28 tests)
```

## Testing

```bash
# Unit tests (Vitest)
npm test

# Unit tests in watch mode
npm run test:watch

# E2E tests (Playwright)
npm run test:e2e
```

### Unit Test Suites

| Suite | Tests | Covers |
|-------|-------|--------|
| useBudget.test.js | 22 | Budget set/get/remove, thresholds, status |
| useReminders.test.js | 22 | Renewal dates, badges, upcoming list |
| useTrends.test.js | 24 | History, MoM/YoY, chart data, CSV export |
| categories.test.js | 21 | Auto-categorization, filtering, spending |
| settingsStore.test.js | 14 | Theme toggle, persistence, legacy compat |
| sheetsApi.test.js | 17 | CSV parsing, connection, data reading |
| syncManager.test.js | 10 | Merge logic, conflict detection, state |
| offlineQueue.test.js | 14 | Queue CRUD, processing, stats |
| sheets-e2e.test.js | 28 | Full sync flows, queue integration |
| + 7 more | 33 | XSS, DOM safety, storage errors, rates, validation |

**Unit total: 205 tests across 16 suites**

### E2E Tests

| Suite | Tests | Covers |
|-------|-------|--------|
| App loads | 3 | Header, empty state, presets |
| Add Subscription | 5 | Modal, form, presets, validation |
| Subscription Management | 4 | Add multiple, edit, delete |
| Dashboard View | 5 | Navigation, totals, CSV export, back |
| Settings | 5 | Open/close, theme, Sheets, import/export |
| Budget Settings | 3 | Set budget, dashboard display, remove |
| Theme Toggle | 1 | Dark/light switch |
| Full User Flow | 2 | Complete flow, data persistence |

**E2E total: 28 tests**

## Mobile (Capacitor)

```bash
# Sync web assets to native projects
npm run cap:sync

# Open in Xcode
npm run cap:ios

# Open in Android Studio
npm run cap:android
```

Capacitor plugins included: Local Notifications, Splash Screen, Status Bar.

## Deployment

Chameleon deploys to **Cloudflare Pages** from the Vite `dist/` output.

### Manual Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name=chameleonfinance
```

### CI/CD with GitHub Actions

The repo includes `.github/workflows/ci.yml` which runs on every push and PR:

1. **Test** -- Runs the full Vitest suite
2. **Build** -- Runs `vite build`
3. **Deploy** -- On `main` branch pushes, deploys `dist/` to Cloudflare Pages

Required GitHub secrets (`Settings > Secrets and variables > Actions`):

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

## Tech Stack

- **UI**: React 19, Vite 7
- **Styling**: Tailwind CSS v4 (with `@tailwindcss/vite` plugin)
- **State**: Zustand 5 with persist middleware
- **Mobile**: Capacitor 8 (iOS + Android)
- **Unit Testing**: Vitest 4, React Testing Library
- **E2E Testing**: Playwright
- **Icons**: Iconify
- **Hosting**: Cloudflare Pages
- **Sync**: Google Sheets (public CSV export)

## Acknowledgments

Inspired by [SubGrid](https://github.com/hoangvu12/subgrid) by hoangvu12.

## License

MIT
