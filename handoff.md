# SubGrid Handoff (Feb 6, 2026)

## State
- Latest summary PDF: `/Users/kunanonjarat/Desktop/subgrid/output/pdf/subgrid-summary.pdf` (1 page, generated via custom minimal PDF writer in `tmp/pdfs/generate_subgrid_summary_pdf.py`).
- PDF preview not rendered here because Poppler (`pdftoppm`) is missing; install Poppler locally to verify visuals.
- No Python PDF libs installed (offline install attempt for `reportlab` failed). The current PDF generator is dependency-free.
- Repo is static SPA (HTML/CSS/JS). No build step.

## Firebase Production Launch Plan (static hosting)
1. Install CLI: `npm install -g firebase-tools` and `firebase login`.
2. Create or select project: `firebase projects:create subgrid-prod` (or choose existing in console).
3. Initialize Hosting in repo root: `firebase init hosting` → pick project → set `public` to `.` → enable SPA rewrite to `/index.html` → decline GitHub Action if you want to add later.
4. Add caching in `firebase.json` (examples):
   - `index.html`: `Cache-Control: no-store`.
   - Assets (`*.js`, `*.css`, `*.png`, `*.json`): `Cache-Control: public, max-age=86400`.
5. Deploy: `firebase deploy --only hosting`.
6. Optional: staging site (`firebase hosting:sites:create subgrid-staging` then deploy with `--only hosting:staging`).
7. Custom domain: Firebase Console → Hosting → Add domain → follow TXT + A records; managed TLS auto-enables.
8. Rollback: `firebase hosting:versions:list` → `firebase hosting:rollback VERSION_ID`.
9. CI/CD (optional): `firebase init hosting:github` to create GitHub Action for preview channels + main deploy.

## App Facts (for docs/users)
- Purpose: visualizes subscription spending as treemap/grid, beeswarm, circle pack.
- Data: stored in browser `localStorage` (`js/storage.js`).
- Imports: bank CSV detection (`js/bank-import.js`), quick-add presets (`js/presets.js`).
- Exports: visualization to PNG via `modern-screenshot`; backup/restore JSON.
- External calls: exchange rates from `https://open.er-api.com`; logos via `logo.dev` token in `js/app.js`.

## File Pointers
- App entry: `index.html`.
- Styles: `styles.css` (Tailwind via CDN).
- Logic: `js/app.js`, `js/treemap.js`, `js/beeswarm.js`, `js/circlepack.js`, `js/bank-import.js`, `js/storage.js`, `js/presets.js`, `js/rates.js`, `js/modals.js`.
- PDF generator: `tmp/pdfs/generate_subgrid_summary_pdf.py` (writes to `output/pdf/`).

## Next Actions
- Review the PDF visually after installing Poppler (`pdftoppm subgrid-summary.pdf out`) and adjust copy if needed.
- Add `firebase.json` and `.firebaserc` with the caching rules above, then deploy to Hosting.
- (Optional) Add GitHub Action for Hosting preview/production deploys.
