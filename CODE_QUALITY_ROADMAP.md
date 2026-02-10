# Subgrid Code Quality Improvement Roadmap

## 🎯 Recommended Future Improvements (Post-Launch)

### Phase 1: Critical Test Coverage (Weeks 1-2)

**Goal**: Improve test coverage from 30% to 60% (add 60 tests)

#### 1.1 Bank Import Module Tests (15 tests)
**File**: `tests/unit/bank-import.test.js`

```javascript
describe("Bank Import CSV Parsing", () => {
  // Test cases needed:
  // 1. Valid CSV structure with all required columns
  // 2. Missing columns (date, amount, description)
  // 3. Malformed CSV (extra quotes, escaped characters)
  // 4. Empty CSV file
  // 5. Single transaction
  // 6. 1000+ transactions (performance)
  // 7. Special characters in merchant names
  // 8. Accented characters (é, ñ, ü)
  // 9. Very long merchant names (>100 chars)
  // 10. Transactions with zero/negative amounts
  // 11. Invalid date formats
  // 12. Recurring transaction detection (same merchant 3+ times)
  // 13. Edge case: biweekly transactions (14-day intervals)
  // 14. Edge case: transactions split by month boundary
  // 15. CSV from different banks (Chase, Wells Fargo, Bank of America formats)
});
```

#### 1.2 Google Sheets Sync Tests (20 tests)
**Files**: `tests/unit/sync-manager.test.js`, `tests/unit/sheets-api.test.js`

```javascript
describe("Google Sheets Sync Manager", () => {
  // Authentication tests (5)
  // - Valid credentials
  // - Expired token refresh
  // - Invalid sheet ID
  // - Permission denied
  // - Network timeout

  // Data merge tests (5)
  // - Merge subscriptions from local & cloud
  // - Merge budgets (keep max)
  // - Merge trends (deduplicate months)
  // - Handle deleted items (marked with [DELETED])
  // - Handle conflicting updates (last-write-wins)

  // Sync operation tests (5)
  // - Full sync cycle (push then pull)
  // - Partial sync (only changed items)
  // - Retry on failure (3 attempts)
  // - Rate limiting (>100 requests/minute)
  // - Connection drop mid-sync

  // Offline tests (5)
  // - Queue changes while offline
  // - Reconnect and sync queue
  // - Handle merge conflicts in queue
  // - Queue persistence across page reload
  // - Memory usage with 1000+ queued changes
});
```

#### 1.3 Offline Queue Tests (10 tests)
**File**: `tests/unit/offline-queue.test.js`

```javascript
describe("Offline Queue", () => {
  // Persistence tests (4)
  // - Add to queue, reload, queue still exists
  // - Process queue, queue cleared
  // - Partial process (some fail), queue retains failures
  // - Storage quota exceeded, queue cleanup

  // Operation types (4)
  // - subscription_add: queue + play adds
  // - subscription_edit: queue + apply updates
  // - subscription_delete: queue + handle deletions
  // - budget_set: queue + apply budget change

  // Retry logic (2)
  // - Exponential backoff (1s, 2s, 4s)
  // - Max 3 retries then manual intervention required
});
```

#### 1.4 Visualization Tests (15 tests)
**Files**: `tests/unit/treemap.test.js`, `tests/unit/beeswarm.test.js`, `tests/unit/circlepack.test.js`

```javascript
describe("Visualization Layouts", () => {
  // Common layout tests (5)
  // - Empty items array (0 items)
  // - Single item (circle, square, packed)
  // - 3-5 items (normal case)
  // - 50+ items (stress test)
  // - Very small values (< $1/month)
  // - Very large values (> $1000/month)
  // - NaN/Infinity prevention

  // Treemap specific (3)
  // - Squarification algorithm correctness
  // - Aspect ratio optimization
  // - Cell positioning overlap detection

  // Beeswarm specific (3)
  // - Collision detection at boundaries
  // - Y-position normalization
  // - Mobile radius vs desktop radius

  // Circle pack specific (4)
  // - Circle packing algorithm correctness
  // - Tangent position calculations
  // - Centering and scaling
  // - Touch interaction (tap to edit/delete)
});
```

---

### Phase 2: Code Refactoring (Weeks 3-4)

**Goal**: Reduce code duplication, improve maintainability

#### 2.1 Extract Utility Functions

**Current Issues**:
- 6 similar `formatCurrency*` functions in `app.js`
- Domain extraction duplicated in 2 places
- Modal open/close patterns duplicated 4 times
- localStorage error handling duplicated 12+ times

**Recommended Actions**:

**File**: `js/utils.js` (expand existing)

```javascript
// Currency Formatting (consolidate 6 functions)
function formatCurrency(amount, style = 'full', decimals = 2, code) {
  const curr = currencies[code || selectedCurrency];
  if (!curr) return '$' + amount.toFixed(decimals);

  if (style === 'short') {
    if (amount >= 1_000_000) return curr.symbol + (amount / 1_000_000).toFixed(1) + "M";
    if (amount >= 10_000) return curr.symbol + (amount / 1_000).toFixed(0) + "k";
  }
  return curr.symbol + formatNum(amount, decimals, code);
}

// Domain Extraction (consolidate 2 locations)
function extractDomain(url) {
  if (!url) return null;
  return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
}

// Safe localStorage Access
function safeLocalStorage(operation, key, value) {
  try {
    if (operation === 'get') {
      return localStorage.getItem(key);
    } else if (operation === 'set') {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      console.warn(`Storage quota exceeded for key: ${key}`);
      return null; // or alert user
    }
    console.error(`Storage error: ${error}`);
    return null;
  }
}

// Modal Helper
function createAndShowModal(backdrop, panel, animation = 'fade') {
  backdrop.classList.remove('hidden');
  panel.classList.add('modal-visible');
  // Handle animation + scroll lock
}
```

#### 2.2 Reduce Global Variables

**Current Globals** (12+):
- `subs`, `step`, `selectedCurrency`, `currentView` (app.js)
- `csvData`, `csvHeaders`, `detectedSubs` (bank-import.js)
- `selectedCategory`, `otherTransactions` (modals.js)
- `otherExpanded`, `csvSourceMode` (bank-import.js)

**Recommended Pattern**:
```javascript
// Create a state singleton
const AppState = {
  subscriptions: [],
  currentStep: 1,
  selectedCurrency: 'USD',
  currentView: 'grid',
  ui: {
    isSidebarOpen: false,
    selectedCategory: null,
  },
  imports: {
    csvData: null,
    detectedSubs: [],
    otherExpanded: false,
  },

  // Getters
  getSubscriptions() { return this.subscriptions; },
  getCurrency() { return this.selectedCurrency; },

  // Setters
  setSubscriptions(subs) {
    this.subscriptions = subs;
    this.notifyObservers('subscriptions-changed');
  },

  // Observer pattern for reactive updates
  observers: [],
  subscribe(callback) { this.observers.push(callback); },
  notifyObservers(event) {
    this.observers.forEach(cb => cb(event));
  }
};
```

#### 2.3 Simplify Complex Functions

**`detectRecurring()` in bank-import.js** (158 lines, 7 nested loops)

**Current**: Single monolithic function

**Refactored**:
```javascript
function detectRecurringTransactions(transactions) {
  const grouped = groupByDescription(transactions);
  const candidates = identifyRecurrencePatterns(grouped);
  const recurring = filterRecurringCandidates(candidates);
  return subscriptionifyRecurring(recurring);
}

function groupByDescription(transactions) {
  // Group similar transactions
}

function identifyRecurrencePatterns(groupedTxns) {
  // Detect weekly/monthly/quarterly patterns
}

function filterRecurringCandidates(patterns) {
  // Filter by min amount, recurrence count, date variance
}

function subscriptionifyRecurring(recurring) {
  // Convert to subscription objects
}
```

---

### Phase 3: Performance Optimization (Week 5)

**Goal**: Reduce initial load time, improve scroll performance

#### 3.1 Current Issues
- Sequential API calls in Sync Manager (can parallelize)
- String concatenation in loops (6+ locations)
- Over-rendering on every subscription change
- DOM queries repeated per frame

#### 3.2 Quick Wins

**1. Parallelize API Calls** (`sync-manager.js:400`)
```javascript
// Before: Sequential
for (const sub of changes.subscriptions) {
  const result = await this.updateSubscription(sub);
}

// After: Parallel
const results = await Promise.all(
  changes.subscriptions.map(sub => this.updateSubscription(sub))
);
```

**2. Use Array.join() Instead of += in Loops**
```javascript
// Before: Inefficient
let html = "";
for (let i = 0; i < items.length; i++) {
  html += "<div>" + item + "</div>";  // Creates new string every iteration
}

// After: Efficient
const parts = items.map(item => `<div>${item}</div>`);
const html = parts.join("");  // Single concatenation
```

**3. Debounce Event Handlers**
```javascript
// Reduce 3 events to 1 update
const debouncedUpdate = debounce(updateCSVPreview, 300);
csvInput.addEventListener('input', () => debouncedUpdate(csvInput.value));

function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
```

**4. Cache DOM Queries**
```javascript
// Bad: Query every time
function renderList(subs) {
  for (let sub of subs) {
    document.getElementById('list').innerHTML += html;  // Query n times
  }
}

// Good: Query once
function renderList(subs) {
  const listContainer = document.getElementById('list');
  listContainer.innerHTML = subs.map(sub => generateHtml(sub)).join('');
}
```

---

### Phase 4: Architecture Improvements (Weeks 6-8)

**Goal**: Better separation of concerns, testability

#### 4.1 Separate Model, View, Controller

```javascript
// Model: Data operations
const SubscriptionModel = {
  subscriptions: [],

  load() {
    return loadSubscriptionsFromStorage();
  },

  add(sub) {
    this.subscriptions.push({...sub, id: generateId()});
    this.persist();
  },

  update(id, data) {
    const idx = this.subscriptions.findIndex(s => s.id === id);
    this.subscriptions[idx] = {...this.subscriptions[idx], ...data};
    this.persist();
  },

  persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.subscriptions));
    this.notify('changed');
  }
};

// View: DOM rendering
const SubscriptionView = {
  render(subscriptions) {
    const html = subscriptions.map(sub => this.renderCard(sub)).join('');
    document.getElementById('list').innerHTML = html;
  },

  renderCard(sub) {
    return `<div class="card" data-id="${escapeHtml(sub.id)}">...</div>`;
  }
};

// Controller: User interactions
const SubscriptionController = {
  init() {
    document.getElementById('list').addEventListener('click', (e) => {
      const subId = e.target.closest('[data-id]')?.dataset.id;
      if (e.target.matches('.btn-edit')) this.edit(subId);
      if (e.target.matches('.btn-delete')) this.delete(subId);
    });
  },

  add(formData) {
    SubscriptionModel.add(formData);
    SubscriptionView.render(SubscriptionModel.subscriptions);
  },

  edit(id) {
    const sub = SubscriptionModel.subscriptions.find(s => s.id === id);
    // Show edit modal
  }
};

// Initialize
SubscriptionModel.load();
SubscriptionView.render(SubscriptionModel.subscriptions);
SubscriptionController.init();
```

#### 4.2 Dependency Injection

```javascript
// Bad: Hard dependencies
class SyncManager {
  constructor() {
    this.sheetsApi = new SheetsAPI(); // Tightly coupled
  }
}

// Good: Injected dependencies
class SyncManager {
  constructor(sheetsApi, offlineQueue, logger) {
    this.sheetsApi = sheetsApi;    // Loosely coupled
    this.offlineQueue = offlineQueue;
    this.logger = logger;
  }
}

// Usage
const sheetsApi = new SheetsAPI(credentials);
const offlineQueue = new OfflineQueue();
const logger = new Logger();
const syncManager = new SyncManager(sheetsApi, offlineQueue, logger);
```

---

## 📊 Code Quality Metrics Target

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| **Test Coverage** | 30% | 80% | 4 weeks |
| **Test Count** | 153 | 220+ | 4 weeks |
| **Code Duplication** | 15% | < 5% | 6 weeks |
| **Global Variables** | 12 | < 3 | 8 weeks |
| **Avg Function Length** | 45 lines | < 30 lines | 8 weeks |
| **Cyclomatic Complexity** | High | Medium | 8 weeks |
| **Bundle Size** | ~50KB | < 45KB | 8 weeks |
| **Lighthouse Score** | TBD | 90+ | 8 weeks |

---

## 🚀 Implementation Timeline

```
Week 1-2: Add critical test coverage (bank import, sync, visualizations)
Week 3-4: Refactor utilities, reduce globals, simplify functions
Week 5:   Performance optimization, parallel APIs, debouncing
Week 6-8: Architecture improvements, MVC pattern, dependency injection
```

---

## ✅ Success Criteria

- [ ] All 10 critical bugs remain fixed
- [ ] Test coverage increases to 60%+
- [ ] No code duplication > 3 locations
- [ ] All functions < 40 lines (except algorithms)
- [ ] Global variables < 3
- [ ] All tests pass without errors
- [ ] No new security vulnerabilities introduced
- [ ] Bundle size stays < 50KB (gzipped)
- [ ] Page load time < 2 seconds
- [ ] Lighthouse score 90+

---

**Document Version**: 1.0
**Created**: 2026-02-10
**Next Review**: After Phase 1 completion (2 weeks)
