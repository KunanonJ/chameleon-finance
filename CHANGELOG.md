# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **Toolchain upgraded to latest** across the board, verified with a green build + full unit suite + dev-server boot smoke:
  - Vite `7 → 8`, `@vitejs/plugin-react` `5 → 6`, `jsdom` `28 → 29`
  - React `19.2.4 → 19.2.7`, Tailwind CSS `4.1.18 → 4.3.1`, Vitest `4.0 → 4.1`
  - Capacitor `8.1 → 8.4`, Playwright `1.58 → 1.60`, recharts `3.7 → 3.8`, zustand/postcss/autoprefixer patches
- Reconciled Cloudflare Pages binding drift: `wrangler.toml` now mirrors the live
  `chameleon-finance` project bindings, `/api/health` reports modern binding names,
  and legacy utility endpoints resolve modern bindings with legacy fallbacks.
- Updated Capacitor splash/notification colors to the current warm-cream and brand-orange palette.
- Removed the experimental product-positioning card and restored plain finance tracker copy
  across the app header, browser metadata, PWA manifest, and handoff notes.

### Added
- **Design system foundation** ported from the "L Health" visual language (see [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)):
  - Semantic OKLCH design tokens (warm cream canvas, near-black ink, periwinkle/water accent) for light **and** dark themes in `src/index.css`, exposed as Tailwind utilities.
  - Brand/status palette overrides (`orange #ff9901`, emerald dual-shade green, water blue, destructive red).
  - Flat hairline card style (no shadows), generous rounding.
  - `<OrangeAsterisk />` brand mark and rethemed app shell.
  - Component-level retheme of all feature surfaces (finance, subscriptions, budget, trends, charts/visualizations) onto the semantic tokens — auto light/dark with no hardcoded `slate`/`indigo`/`dark:` variants.
- Professional project documentation set (`CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `docs/*`, GitHub issue/PR templates).

---

<!--
Template for releases:

## [x.y.z] - YYYY-MM-DD
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
-->
