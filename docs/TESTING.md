# Testing Guide

Open Finance uses **Vitest** for unit/integration tests and **Playwright** for end-to-end tests.

## Commands

| Command | Scope |
|---------|-------|
| `npm test` | Run all unit/integration tests once (Vitest, jsdom) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:e2e` | Playwright E2E (`tests/e2e/`, config `playwright.config.js`) |

Current baseline: **282 unit tests passing** across 25 files.

## Philosophy

- **TDD first** — write the failing test before the code (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
- **Test behavior, not implementation.** Avoid asserting on private functions or internal call order.
- **Chase behavior coverage, not 100% line coverage.** Critical paths get happy path + failure modes + edge values.
- **FIRST:** Fast · Independent · Repeatable · Self-validating · Timely. A flaky test is a broken test.

## Where tests live

- **Unit/integration:** colocated as `*.test.js` next to the code, primarily under `src/shared/lib/`
  (e.g. `financeUtils.test.js`, `currencies` math, `csvParser.test.js`, `bankStatementImport.test.js`,
  `serverStorage.test.js`, `dom-safety.test.js`, `price-validation.test.js`, `rates-error.test.js`,
  `storage-errors.test.js`).
- **E2E:** `tests/e2e/` (Playwright).

## Critical paths to cover (finance app)

| Area | Must test |
|------|-----------|
| Currency / money math | rounding, NaN/Infinity guards, sign handling, empty currency map, `toMonthly` for each billing cycle |
| CSV / bank import | quoted fields, embedded commas/newlines, malformed rows, locale numbers, formula-injection inputs |
| Sync / backup | concurrent sync, partial failure, offline queue ordering, JSON.parse on responses |
| Visualization layout | empty data, single item, sum = 0 (division by zero), negative values |
| Backend functions | per-user token scoping (IDOR), input validation, path traversal on file params |

## Structure (AAA)

```js
test('toMonthly > given yearly cycle > divides amount by 12', () => {
  // Arrange
  const sub = { amount: 120, cycle: 'yearly', currency: 'USD' }
  // Act
  const monthly = toMonthly(sub, 'USD', currencies)
  // Assert
  expect(monthly).toBe(10)
})
```

## Before merging

- No `.only`, `.skip`, `xit`, `xdescribe`, or commented-out tests.
- Whole suite green (`npm test`), not just the new test.
- New behavior has a test that was seen failing before the fix.
