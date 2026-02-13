# SubGrid

A subscription cost tracker and visualizer. See where your money goes each month through interactive treemaps, beeswarm charts, and circle packs -- with optional Google Sheets sync.

## Features

- **Subscription Tracking** -- Add, edit, and delete subscriptions with price, currency, billing cycle, and category
- **Visual Dashboards** -- Treemap, beeswarm, and circle pack views of your spending
- **Budget Alerts** -- Set monthly budget limits with threshold warnings (safe / warning / caution / danger)
- **Categories** -- Auto-categorize subscriptions (entertainment, productivity, health, education, utilities)
- **Renewal Reminders** -- Browser notifications for upcoming renewals with configurable lead time
- **Spending Trends** -- Month-over-month and year-over-year analysis with CSV export
- **Dark Mode** -- System-aware theme toggle
- **Google Sheets Sync** -- Pull subscription data from a public Google Sheet with conflict resolution
- **Offline Support** -- Changes queued locally and replayed when connectivity returns
- **Bank Import** -- Import subscriptions from bank statement CSVs
- **Multi-Currency** -- 38+ currencies with live exchange rates
- **Export** -- Save visualizations as images, export data as JSON

## Quick Start

```bash
# Clone
git clone https://github.com/KunanonJ/abdull-finance.git
cd abdull-finance

# Install dev dependencies (for tests)
npm install

# Serve locally
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000` (or the port shown by your server). All data is stored in your browser's localStorage.

## Google Sheets Sync

SubGrid can pull data from a public Google Sheet. No API key needed.

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

1. Open SubGrid settings panel
2. Paste your Google Sheet URL
3. Click **Connect**
4. Use **Sync Now** to pull the latest data

Conflict resolution uses last-write-wins by timestamp. If both local and cloud versions were modified within 60 seconds, a dialog lets you choose which to keep.

## Project Structure

```
subgrid/
  index.html              # Single-page app entry point
  styles.css              # Custom styles (sync indicators, theme)
  js/
    app.js                # Main app logic, form handling, Google Sheets UI
    storage.js            # localStorage CRUD with sync hooks
    sheets-api.js         # Google Sheets public CSV reader
    sync-manager.js       # Bidirectional sync orchestration
    offline-queue.js      # Offline change queue with retry
    budget.js             # Budget management
    categories.js         # Category auto-detection
    reminders.js          # Renewal reminders + notifications
    trends.js             # Spending trends analysis
    theme.js              # Dark/light mode
    rates.js              # Currency exchange rates
    presets.js             # Preset subscription templates
    treemap.js            # Treemap visualization
    beeswarm.js           # Beeswarm chart
    circlepack.js         # Circle pack chart
    modals.js             # Modal UI handlers
    bank-import.js        # Bank CSV import
    utils.js              # Shared utilities (escapeHtml, etc.)
    analytics.js          # Client analytics
    r2-storage.js         # R2 cloud backup
  tests/
    setup.js              # Jest test environment setup
    unit/                 # Unit + E2E tests
  d1/
    schema.sql            # D1 database schema (push notifications)
  functions/
    api/event.js          # Cloudflare Pages Function (analytics)
  scripts/
    generate-vapid-keys.js
  jest.config.js          # Jest configuration
  wrangler.jsonc          # Cloudflare Pages deployment config
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test suite
npx jest tests/unit/sheets-api.test.js

# Run E2E integration tests only
npx jest tests/unit/sheets-e2e.test.js
```

### Test Suites

| Suite | Tests | Covers |
|-------|-------|--------|
| sheets-api.test.js | 17 | CSV parsing, connection, data reading |
| sync-manager.test.js | 16 | Merge logic, conflict detection, state |
| offline-queue.test.js | 17 | Queue CRUD, retry, stats |
| sheets-e2e.test.js | 40 | Full flows: connect/sync/disconnect, conflicts, offline, UI |
| budget.test.js | 22 | Budget thresholds, usage calculation |
| categories.test.js | 22 | Auto-categorization, filtering |
| reminders.test.js | 22 | Renewal dates, notifications |
| trends.test.js | 24 | Snapshots, MoM/YoY, chart data |
| theme.test.js | 24 | Dark/light toggle, persistence |
| + 6 more | 53 | XSS, DOM safety, storage errors, rates, validation |

**Total: 237 tests, 16 suites**

## Deployment

SubGrid deploys to **Cloudflare Pages** with zero build step (static files served directly).

### Manual Deploy

```bash
npx wrangler pages deploy . --project-name=abdull-finance
```

### CI/CD with GitHub Actions

The repo includes `.github/workflows/ci.yml` which runs on every push and PR:

1. **Test** -- Installs dependencies and runs the full test suite
2. **Deploy** -- On `main` branch pushes, deploys to Cloudflare Pages

To enable deployment, add these secrets in your GitHub repo settings (`Settings > Secrets and variables > Actions`):

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Styling**: Tailwind CSS (CDN), custom CSS
- **Icons**: Iconify
- **Hosting**: Cloudflare Pages
- **Database**: Cloudflare D1 (push notification subscriptions)
- **Storage**: Cloudflare R2 (cloud backups)
- **Testing**: Jest + jsdom
- **Sync**: Google Sheets Visualization API (public CSV export)

## License

MIT
