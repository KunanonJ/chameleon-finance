# Design System

Open Finance's visual language now combines the original warm finance tracker tokens with the
editorial paper system imported from `docs/design/open-design-landing/`. The **source of truth is the code**:
global tokens and route-specific shells live in [`src/app/styles/index.css`](../src/app/styles/index.css). Update this
doc when you change a token or shell pattern.

## Vibe

Warm **cream/paper canvas**, **near-black ink**, coral editorial punctuation, muted finance green,
flat hairline modules, and bold display headings. The landing and app shell use print-editorial
patterns: metadata bands, side rails on desktop, ruled sections, framed work surfaces, and numbered
tabs. Product modules remain calm and functional, with rounded controls where repeated finance
workflows need touch-friendly affordances.

## How tokens work (Tailwind v4)

- **Neutrals/surfaces** are authored in **OKLCH** on `:root`, with a `[data-theme="dark"]` override.
- Those vars are mapped to utilities in an **`@theme inline`** block, so `bg-background`,
  `text-foreground`, `bg-card`, `border-foreground`, `bg-secondary`, `text-muted-foreground`,
  `ring-ring`, `bg-destructive` all read the live var and **switch with the theme**.
- **Brand/status accents** override Tailwind palette names in a plain `@theme` block, so
  `bg-orange-500` / `text-emerald-700` / `text-red-500` map to brand hex.

### Semantic tokens (light)

| Token | Value | Role |
|-------|-------|------|
| `--background` | `oklch(0.963 0.018 83)` | warm cream page canvas |
| `--foreground` | `oklch(0.24 0.008 60)` | near-black ink (text **and** card borders) |
| `--card` / `--popover` | `oklch(0.998 0.003 83)` | near-white card surface |
| `--secondary` | `oklch(0.92 0.04 248)` | soft periwinkle/water surface |
| `--muted-foreground` | `oklch(0.52 0.025 255)` | captions / sub-labels |
| `--border` / `--input` | `oklch(0.9 0.018 250)` | hairline borders, input outlines |
| `--ring` | `oklch(0.66 0.13 252)` | focus ring (water-blue) |
| `--destructive` | `oklch(0.62 0.17 18)` | error red |
| `--water` / `--water-text` | `#378add` / `#185fa5` | water feature fill / readable text |
| `--track` | `#f0eee6` | warm-gray pill / segment track |

A `[data-theme="dark"]` block redefines these to a warm charcoal palette (toggled via
`useTheme` setting `data-theme="dark"` on `<html>`).

### Brand & status palette (`@theme` overrides)

| Utility | Hex | Used for |
|---------|-----|----------|
| `orange-500` | `#ff9901` | brand asterisk, primary brand accent |
| `yellow-400` | `#ffd200` | caution / warning |
| `red-500` | `#df2d19` | destructive (delete, revoke) |
| `emerald-50` | `#e9fcf2` | pale mint chip background |
| `emerald-500/600` | `#00bf63` | brand green — **fills only** |
| `emerald-700` | `#15844e` | **readable** green text/chips |

> **Green dual-shade rule:** `#00bf63` is vivid — great as a *fill* but below AA for small text
> on cream (~2.4:1). Use `emerald-500/600` for fills and `emerald-700` for any green **text/chip**.
> Apply the same logic to any new bright accent: bright = fill only; derive a darker shade for text.

## Component recipes

- **Card** — `rounded-xl border-[0.5px] border-foreground bg-card p-4` (or `py-6` with `px-6`
  content). A thin near-black hairline on near-white over cream. **No shadow.**
- **Pills / segmented toggle** — `rounded-full ... text-xs`; selected `bg-foreground text-background`,
  idle `bg-[var(--track)] text-muted-foreground`.
- **Status chips** — improvement `bg-emerald-50 text-emerald-700`; warning `bg-amber-50 text-amber-700`;
  error `bg-red-50 text-red-700` (or the `--secondary`/`--water-text` pair for neutral/info).
- **Primary button** — `bg-foreground text-background` (ink button; flat). Secondary — periwinkle
  `bg-secondary`. Destructive — `bg-red-500 text-white`.
- **Brand mark** — the app shell uses a compact Greek/ledger-inspired `Φ` seal inside a hairline
  circle. Legacy `<OrangeAsterisk />` is still available but should not be introduced into new
  Open Finance editorial surfaces.

## Editorial Shells

- **Landing route** — rendered from `docs/design/open-design-landing/open-finance-atelier-landing.html`
  through `src/features/landing/OpenFinanceLanding.jsx`; assets are served from
  `public/open-design-assets/`. Keep this route source-backed when exact fidelity to the provided
  export is required.
- **App route** — scoped under `.of-app-*`; wraps existing finance modules in a paper workspace
  with `OF / 2026`, `Private ledger workspace`, the `Open Finance app workspace` main region, and
  an `App sections` navigation. Do not place product data logic in the shell.
- **Responsive rule** — hide side rails below tablet widths, collapse metadata and tabs before
  allowing horizontal scroll, and keep controls at 16px+ input text size.
- **Copy rule** — avoid shell labels that contain `Back` unless they are the actual Back control;
  existing E2E flows use that text to navigate dashboards.

## ⚠️ Theming rules (don't break dark mode)

1. **Pair semantic backgrounds with semantic foregrounds:** `bg-foreground text-background` —
   **never** `bg-foreground text-white`. `--foreground` is cream in dark mode, so `text-white`
   on it is illegible. (This was a real bug caught during the retheme.)
2. **No raw hex in components** for neutrals — use the semantic utilities so both themes work.
   Brand-accent utilities (`orange-500`, `emerald-700`, …) are fine; they're the single override point.
3. **Tabular figures** (`tabular-nums`) for all numeric values.
4. Keep motion restrained — `transition-colors` only; cards stay flat.

## Changing the design

- Colors / radius / breakpoints: edit [`src/app/styles/index.css`](../src/app/styles/index.css). To retheme a feature
  accent, override the Tailwind name in the `@theme` block (one source of truth) rather than
  hardcoding hex in components.
- Update this doc whenever you add or change a token.
