# Development Guide

Local setup, environment, and the everyday commands for working on Open Finance.

## Prerequisites

- **Node 22** (see [`.node-version`](../.node-version)) — use `nvm use` or `fnm use`.
- **npm** (ships with Node 22). Install deps with `npm install` (uses `package-lock.json`).
- **Wrangler** (`npx wrangler`) — only needed when working on the Cloudflare Functions / D1 / R2 layer.

## Install

```bash
nvm use            # or: fnm use   (selects Node 22)
npm install
```

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `LOGO_DEV_API_TOKEN` | `.dev.vars` (Functions) | token for the `/api/logo/:domain` proxy. Copy [`.dev.vars.example`](../.dev.vars.example) → `.dev.vars`. |
| `VITE_CLOUDFLARE_ANALYTICS_TOKEN` | `.env` (frontend, optional) | injects the Cloudflare Analytics beacon in `src/main.jsx`. Omit to disable. |

> Never commit `.dev.vars` or `.env`. Reference secrets by name only. See [DEPLOYMENT.md](DEPLOYMENT.md) for production secrets.

## Everyday commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server with HMR → http://localhost:5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Run the unit suite once (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end tests |

### Running the Cloudflare Functions locally

`npm run dev` serves only the frontend. To exercise `functions/api/*` (logo proxy, backup, R2, D1):

```bash
npm run build
npx wrangler pages dev dist
```

This loads bindings from `wrangler.jsonc` and secrets from `.dev.vars`.

## Mobile (Capacitor)

The web build is wrapped for iOS/Android via Capacitor (`appId: com.chameleon.app`).

```bash
npm run build
npm run cap:sync      # copy web build into native projects
npm run cap:ios       # open Xcode
npm run cap:android   # open Android Studio
```

## Project layout

```text
src/
  app/
    main.jsx          # bootstrap + optional analytics beacon
    App.jsx           # app shell, tab routing, auto-sync / auto-backup loops
    styles/index.css  # design tokens + global styles (see DESIGN_SYSTEM.md)
    test/setup.js     # Vitest/browser test setup
  store/              # Zustand stores (subscription, finance, currency, settings/theme)
  features/           # feature modules (finance, subscriptions, budget, trends,
                      #   visualizations, reminders, presets, sync, settings)
  shared/lib/         # pure domain logic (currencies, financeUtils, csvParser,
                      #   bankStatementImport, sankey/treemap layout, serverStorage)
  shared/hooks/       # shared hooks (useTheme)
  shared/ui/          # reusable UI primitives (incl. OrangeAsterisk brand mark)
functions/api/        # Cloudflare Pages Functions (see API.md)
infra/d1/schema.sql   # D1 schema (push subscriptions / notifications)
tests/e2e/            # Playwright tests
tools/scripts/        # utility scripts (VAPID keys, statement PDF conversion)
docs/design/          # source design exports and handoff assets
```

## Conventions

- Follow **TDD** and the coding standards in [CONTRIBUTING.md](../CONTRIBUTING.md).
- Style with **design tokens**, not raw hex — see [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- Treat money/sync/import code as critical-path: validate inputs and test edge cases.
