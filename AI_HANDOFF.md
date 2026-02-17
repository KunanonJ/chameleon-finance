# AI Handoff: Chameleon Finance

Updated: 2026-02-17

## Project Snapshot

- Repo: `https://github.com/KunanonJ/abdull-finance.git`
- Branch: `main`
- Cloudflare Pages project: `chameleon-finance`
- Production URL: `https://chameleon-finance.pages.dev`
- Latest deployment URL: `https://69885308.chameleon-finance.pages.dev`
- Cloudflare account ID used for deploy: `187ab61ed9dbc6e616cb23e6b95aa8f1`

## What Changed In This Session

### 1. Multi-file bank statement upload (Finance Tracker)
- Added new parser/import pipeline for `.csv/.tsv/.txt` statements.
- Supports header alias detection (`date`, `description`, `amount`, `debit`, `credit`, `balance`, `type`).
- Supports amount/date normalization + row-level validation.
- Deduplicates imported records against existing finance records.
- Added toolbar upload action and import summary message.
- Files:
  - `/Users/kunanonjarat/Desktop/subgrid/src/shared/lib/bankStatementImport.js`
  - `/Users/kunanonjarat/Desktop/subgrid/src/features/finance/FinanceToolbar.jsx`
  - `/Users/kunanonjarat/Desktop/subgrid/src/shared/lib/bankStatementImport.test.js`
  - `/Users/kunanonjarat/Desktop/subgrid/e2e/finance.spec.js`

### 2. Cloudflare social login for cloud backup/restore
- Added auth helper to resolve identity from:
  - legacy `X-User-Token` header, or
  - Cloudflare Access identity headers.
- Added `/api/auth/me` endpoint for frontend login state.
- Updated D1 and R2 backup routes to accept either auth mode.
- Updated Settings UI with:
  - social login status
  - sign in / sign out links via Cloudflare Access
  - refresh login status action
- Updated auto-backup flow to run with either:
  - valid token, or
  - active Cloudflare Access session.
- Files:
  - `/Users/kunanonjarat/Desktop/subgrid/functions/api/_lib/auth.js`
  - `/Users/kunanonjarat/Desktop/subgrid/functions/api/auth/me.js`
  - `/Users/kunanonjarat/Desktop/subgrid/functions/api/db/backup.js`
  - `/Users/kunanonjarat/Desktop/subgrid/functions/api/r2/_middleware.js`
  - `/Users/kunanonjarat/Desktop/subgrid/src/shared/lib/serverStorage.js`
  - `/Users/kunanonjarat/Desktop/subgrid/src/features/settings/SettingsModal.jsx`
  - `/Users/kunanonjarat/Desktop/subgrid/src/App.jsx`
  - `/Users/kunanonjarat/Desktop/subgrid/src/shared/lib/serverStorage.test.js`

### 3. Docs + repo hygiene
- Updated README with:
  - latest deployment URL
  - current test totals
  - social login + backup notes
  - bank statement import mention
- Ignored local npm cache directory in git.
- Files:
  - `/Users/kunanonjarat/Desktop/subgrid/README.md`
  - `/Users/kunanonjarat/Desktop/subgrid/.gitignore`

## Verification Results

- Build: `npm run build` passed
- Unit tests: `271/271` passed
- E2E tests: `55/55` passed

## Deploy Runbook

```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=187ab61ed9dbc6e616cb23e6b95aa8f1 \
npx wrangler pages deploy dist --project-name=chameleon-finance --commit-dirty=true
```

## Runtime/Binder Requirements

- `LOGO_DEV_API_TOKEN` (secret)
- `R2_BUCKET` (for R2 backup/fallback and storage routes)
- D1 binding for DB backup endpoint:
  - preferred: `USER_DB`
  - also supported: `DB` or `ABDULL_DB`

## Notes For Next AI/Dev

- Cloud backup/restore now supports two auth modes:
  - token mode (`X-User-Token`, 64-hex), and
  - Cloudflare Access social login mode (header-driven identity).
- For social login to work in production, configure Cloudflare Zero Trust Access app + IdP policy for the Pages domain.
- Read these first for auth + backup flow:
  - `/Users/kunanonjarat/Desktop/subgrid/src/shared/lib/serverStorage.js`
  - `/Users/kunanonjarat/Desktop/subgrid/functions/api/_lib/auth.js`
  - `/Users/kunanonjarat/Desktop/subgrid/functions/api/auth/me.js`
  - `/Users/kunanonjarat/Desktop/subgrid/src/features/settings/SettingsModal.jsx`
