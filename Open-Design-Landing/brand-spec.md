# Open Finance Brand Spec

Source: submitted discovery brief plus direct checks against `https://open-finance.ai`, `https://open-finance.ai/brand`, `https://open-finance.ai/press`, and `https://open-finance.ai/about`. The public URL fetch returned HTTP 403 in this environment, so no live CSS tokens were extracted.

## Tokens

```css
:root {
  --bg: oklch(92.9% 0.029 89.6);
  --surface: oklch(95.8% 0.026 92.4);
  --fg: oklch(19.1% 0.010 97.9);
  --muted: oklch(44.8% 0.021 84.6);
  --border: oklch(86.5% 0.039 89.1);
  --accent: oklch(68.8% 0.160 30.4);
  --finance: oklch(67.3% 0.091 165.9);
  --aegean: oklch(47.2% 0.100 250.3);
  --aegean-dark: oklch(31.9% 0.067 250.2);
  --marble: oklch(95.4% 0.020 92.4);
  --coin: oklch(63.7% 0.111 82.2);

  --font-display: 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-serif: 'Playfair Display', 'Times New Roman', Georgia, serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Menlo, ui-monospace, monospace;
}
```

## Layout Posture

- Warm paper editorial canvas with dotted hairline rules and visible issue metadata.
- Sans display headlines with italic serif emphasis spans and coral terminating dots.
- One coral accent for editorial punctuation; mint is reserved for finance status, privacy, and sync signals.
- Greek financial layer uses Aegean blue, marble surface, coin ochre, Greek-key/meander rules, and Attic-register language as a visual metaphor.
- Collage plates should feel like archival financial records, device-local ledgers, statement imports, and private dashboards rather than generic AI abstractions.
- Rounded UI is limited to product modules and pills; page sections use borders, grid, whitespace, and print-like rhythm.

## Logo System

- Primary mark: `assets/open-finance-mark.svg`, a Greek temple-coin seal with a pediment, column strokes, meander corner geometry, olive details, an Omicron Phi ledger monogram, Aegean blue structure, coin ochre ring, and coral editorial dot.
- Primary lockup: `assets/open-finance-lockup.svg`, for hero decks, share cards, README headers, and social crops where the wordmark needs to travel with the seal.
- Specimen sheet: `assets/open-finance-logo-sheet.svg`, for reviewing mark, lockup, reverse field, clearspace, and palette usage.
- Clearspace: keep at least one quarter of the mark diameter around the seal; do not let the Greek-key edge touch text, dividers, or image crops.
- Minimum size: 32px for app/nav use, 56px for editorial seals, 120px for standalone brand moments.
- Do not reintroduce the money emoji as the brand mark. It may appear as casual copy, but the logo is the temple-coin seal.

## Logo Exploration

- Review board: `logo-options.html`.
- Option 01: `assets/open-finance-logo-option-1-temple-treasury.svg` - editorial temple-coin master mark.
- Option 02: `assets/open-finance-logo-option-2-ionic-ledger.svg` - Ionic column plus private ledger page.
- Option 03: `assets/open-finance-logo-option-3-owl-drachma.svg` - Athenian owl coin for financial awareness.
- Option 04: `assets/open-finance-logo-option-4-meander-monogram.svg` - compact Greek-key OF monogram for small UI.
- Option 05: `assets/open-finance-logo-option-5-marble-tablet.svg` - marble ledger tablet with optional cloud-backup cue.
- Recommended direction: use Option 01 for the editorial identity and Option 04 as the small-size derivative.
