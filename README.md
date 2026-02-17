# Chameleon Finance

Chameleon is a personal finance web app for managing subscriptions and finance records in one place.

- Production: [https://chameleon-finance.pages.dev](https://chameleon-finance.pages.dev)
- Stack: React, Vite, Zustand, Tailwind, Recharts, Cloudflare Pages Functions
- Latest production deployment (2026-02-17): [https://69885308.chameleon-finance.pages.dev](https://69885308.chameleon-finance.pages.dev)

## Core Features

### Finance Tracker
- Add/edit/delete records (Income, Utility, Loan, Credit Card)
- Summary totals (income, expenses, minimum expenses, net balance)
- Visual dashboards (Bar, Line, Pie, Area, Treemap, Sankey)
- Multi-file bank statement import (`.csv/.tsv/.txt`) with dedupe + import summary
- Google Sheets import for finance tabs with header-based mapping
- Icon/domain support and date/due-date normalization

### Subscription Tracker
- Add/edit/delete subscriptions with cycle, category, and currency
- Renewal reminders
- Budget indicators + trends
- Dashboard views and CSV export

### Settings and Data
- Theme toggle (light/dark)
- Google Sheets sync
- JSON import/export
- Optional secure cloud backup/restore via token or Cloudflare social login

## Data Storage Model

Default behavior:
- Data is stored locally in browser `localStorage`.

Optional cloud backup:
- User can either:
  - enter a 64-char token in Settings, or
  - sign in through Cloudflare Access social login (Google/GitHub/etc).
- Backup path is database-first:
  - Primary: `POST/GET /api/db/backup` (D1)
  - Fallback: `POST/GET /api/r2/backup` (R2)
- Auto-backup is enabled when auth is available (valid token or Cloudflare Access session):
  - On data changes (subscriptions, finance records, budget/trends updates)
  - Debounced after edits
  - Every 5 minutes
  - On tab focus / visibility return

## Local Development

```bash
git clone https://github.com/KunanonJ/abdull-finance.git
cd abdull-finance
npm install
npm run dev
```

Open `http://localhost:5173`.

## Testing

```bash
npm test
npm run test:e2e
```

Latest verified status:
- Vitest: `271/271` passing
- Playwright E2E: `55/55` passing

## Cloudflare Setup

### Required Function Bindings
- `LOGO_DEV_API_TOKEN` (secret for logo proxy endpoint)
- `R2_BUCKET` (for R2 backup/fallback + storage endpoints)
- D1 binding for DB backup endpoint:
  - Preferred: `USER_DB`
  - Also accepted by code: `DB` or `ABDULL_DB`

### Social Login via Cloudflare Access
1. In Cloudflare Zero Trust, add an **Access application** for your Pages production domain (for example `chameleon-finance.pages.dev`).
2. Add at least one social identity provider (Google/GitHub/etc.) and include it in an Access policy.
3. Ensure policy allows your intended users.
4. In the app Settings:
   - use **Social Login (Cloudflare Access)** section to sign in/out.
   - `Backup to Cloud` and `Restore from Cloud` will then use the authenticated Access identity automatically (without manual token).

### Build + Deploy

```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=187ab61ed9dbc6e616cb23e6b95aa8f1 \
npx wrangler pages deploy dist --project-name=chameleon-finance --commit-dirty=true
```

## Google Sheets Sync

No API key required. Sheet must be shared as **Anyone with the link can view**.

Expected tabs:
- `Subscriptions`
- `Budget`
- `Trends`
- Finance import tab from URL `gid` or fallback `Sheet1`

Finance template:
- [https://docs.google.com/spreadsheets/d/1zhSnlIoqUSCkPMOCPT711rnsaIEDHhCjnBHixnBzXeo/copy](https://docs.google.com/spreadsheets/d/1zhSnlIoqUSCkPMOCPT711rnsaIEDHhCjnBHixnBzXeo/copy)

## Important Files

- `/Users/kunanonjarat/Desktop/subgrid/src/App.jsx`
- `/Users/kunanonjarat/Desktop/subgrid/src/shared/lib/serverStorage.js`
- `/Users/kunanonjarat/Desktop/subgrid/src/features/settings/SettingsModal.jsx`
- `/Users/kunanonjarat/Desktop/subgrid/functions/api/db/backup.js`
- `/Users/kunanonjarat/Desktop/subgrid/AI_HANDOFF.md`
