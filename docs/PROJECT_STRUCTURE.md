# Project Structure

Open Finance keeps runtime-facing framework conventions at the repository root and groups product
code by ownership boundary.

```text
src/
  app/                  React entrypoint, app shell, global styles, test setup
  features/             Feature modules grouped by user-facing product area
  shared/               Reusable hooks, UI primitives, and pure domain utilities
  store/                Zustand stores and persistence boundaries
functions/api/          Cloudflare Pages Functions, kept at root for platform discovery
tests/e2e/              Playwright end-to-end coverage
infra/d1/               Database schema and deployable infrastructure artifacts
tools/scripts/          Local developer and data-conversion utilities
docs/design/            Source design exports, handoff docs, and reference assets
public/                 Static files served from stable public URLs
```

## Ownership Rules

- Put route/bootstrap concerns in `src/app/`; do not add feature business logic there.
- Put product capabilities in `src/features/<feature>/`, with tests colocated beside the behavior.
- Put reusable, feature-neutral logic in `src/shared/`.
- Keep persistent client state in `src/store/` and server state access behind `functions/api/`.
- Keep Cloudflare Pages Functions in `functions/`; moving this directory breaks platform discovery.
- Keep public asset URL contracts in `public/`; design-source files belong in `docs/design/`.
- Keep local one-off utilities in `tools/scripts/` unless they become part of the production build.

## Adding New Files

Choose the narrowest owner first:

1. User-facing feature behavior: `src/features/<feature>/`
2. App shell, route-level composition, or global styling: `src/app/`
3. Shared UI or pure utilities: `src/shared/`
4. Persistent state: `src/store/`
5. API endpoint: `functions/api/`
6. Deployment schema or infrastructure artifact: `infra/`
7. E2E flow: `tests/e2e/`
8. Design reference or source handoff: `docs/design/`
