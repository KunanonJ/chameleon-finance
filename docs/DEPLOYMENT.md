# Deployment Guide

Open Finance deploys as a **Cloudflare Pages** app: a static Vite build (`dist/`) plus
**Pages Functions** (`functions/api/*`), with **R2**, **D1**, and **Analytics Engine** bindings.

- **Production:** https://chameleon-finance-c4y.pages.dev

## Build output

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist` (`pages_build_output_dir`) |
| Functions | auto-discovered from `functions/` |
| Node version | 22 (`.node-version`) |

## Bindings (source of truth: `wrangler.jsonc`)

| Binding | Type | Name |
|---------|------|------|
| `R2_BUCKET` | R2 bucket | `subgrid-storage` |
| `ANALYTICS` | Analytics Engine dataset | `subgrid_events` |
| D1 | D1 database | schema in [`infra/d1/schema.sql`](../infra/d1/schema.sql); bind as `USER_DB` or `DB` |

`wrangler.jsonc` is the primary Pages config. `wrangler.toml` is kept as a compatibility mirror
for local/CLI workflows and should use the same project and binding names. Legacy handlers still
accept `ABDULL_*` fallbacks, but new config should use `R2_BUCKET`, `USER_DB`/`DB`, and `ANALYTICS`.

## Secrets

Set production secrets in the Cloudflare dashboard (Pages → Settings → Environment variables) or via Wrangler — **never commit them**:

```bash
npx wrangler pages secret put LOGO_DEV_API_TOKEN
```

| Secret | Used by |
|--------|---------|
| `LOGO_DEV_API_TOKEN` | `functions/api/logo/[domain].js` (logo.dev proxy) |

`VITE_CLOUDFLARE_ANALYTICS_TOKEN` is a **build-time** frontend var; set it in the Pages build environment if analytics is desired.

## Authentication model

API routes resolve a per-user token (see `functions/api/_lib/auth.js`):

1. **`X-User-Token`** header — a 64-char hex token (client-generated identity), **or**
2. **Cloudflare Access** identity headers (`Cf-Access-Authenticated-User-*`), hashed (SHA-256) into a stable token.

All user-scoped storage (D1 rows, R2 keys) is keyed by this token. When adding endpoints, scope every read/write to the resolved token to prevent cross-user access (IDOR).

## Deploy

Pushing to the connected branch triggers a Cloudflare Pages build automatically. For manual/preview deploys:

```bash
npm run build
npx wrangler pages deploy dist
```

## D1 schema

Apply the schema in [`infra/d1/schema.sql`](../infra/d1/schema.sql):

```bash
npx wrangler d1 execute <DB_NAME> --file=infra/d1/schema.sql        # local
npx wrangler d1 execute <DB_NAME> --file=infra/d1/schema.sql --remote  # production
```

## Pre-deploy checklist

- [ ] `npm run build` and `npm test` green
- [ ] Secrets set in the target environment
- [ ] Wrangler config + binding names match the target environment
- [ ] D1 schema applied if changed
- [ ] `CHANGELOG.md` updated
