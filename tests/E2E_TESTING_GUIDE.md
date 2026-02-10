# SubGrid E2E Testing Guide

## Setup Test Data

Create 5 sample subscriptions to test all features:

```javascript
const testSubs = [
  {
    id: '1',
    name: 'Netflix',
    price: 15.99,
    currency: 'USD',
    cycle: 'Monthly',
    category: 'entertainment',
    url: 'netflix.com',
    color: 'blue',
    startDate: new Date(new Date().getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notificationsEnabled: true,
    reminderDays: 7
  },
  {
    id: '2',
    name: 'Notion',
    price: 10,
    currency: 'USD',
    cycle: 'Monthly',
    category: 'productivity',
    url: 'notion.so',
    color: 'purple',
    startDate: new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notificationsEnabled: false,
    reminderDays: 7
  },
  {
    id: '3',
    name: 'Spotify',
    price: 11.99,
    currency: 'USD',
    cycle: 'Monthly',
    category: 'entertainment',
    url: 'spotify.com',
    color: 'green',
    startDate: new Date(new Date().getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notificationsEnabled: true,
    reminderDays: 3
  },
  {
    id: '4',
    name: 'Gym Pro',
    price: 50,
    currency: 'USD',
    cycle: 'Monthly',
    category: 'health',
    url: 'gym.com',
    color: 'orange',
    startDate: new Date(new Date().getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notificationsEnabled: true,
    reminderDays: 14
  },
  {
    id: '5',
    name: 'AWS',
    price: 100,
    currency: 'USD',
    cycle: 'Monthly',
    category: 'utilities',
    url: 'aws.amazon.com',
    color: 'yellow',
    startDate: new Date(new Date().getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notificationsEnabled: false,
    reminderDays: 7
  }
];
// Total: $187.98/month
```

## Feature 1: Budget Alerts & Thresholds ✓

### Test Case B1: Set Budget
1. Open Settings
2. Enter Budget Amount: 200
3. Select Currency: USD
4. Click "Save Budget"
5. **Expected**: Budget bar shows ~94% (187.98/200)
6. **Expected**: Status shows "✓ Within budget" in green

### Test Case B2: Update Subscriptions with Budget
1. Add new subscription: YouTube Premium $15/month
2. **Expected**: Total becomes $202.98
3. **Expected**: Budget bar updates to ~101%
4. **Expected**: Status changes to "✗ Over budget (100%+)" in red

### Test Case B3: Budget Persistence
1. Refresh page
2. **Expected**: Budget still shows 200 USD
3. **Expected**: Budget bar still displays correctly

### Test Case B4: Multi-Currency Budget
1. Clear budget
2. Set budget to 150 EUR
3. **Expected**: Subscriptions auto-convert using rates
4. **Expected**: Percentage calculates correctly

## Feature 2: Subscription Categories ✓

### Test Case C1: Auto-Suggestion
1. Open Add Subscription modal
2. Type "Netflix" in Service Name
3. **Expected**: Suggestion shows "Entertainment"
4. Type "Slack"
5. **Expected**: Suggestion changes to "Productivity"

### Test Case C2: Category Filter
1. Navigate to Step 1
2. Click "Entertainment" filter button
3. **Expected**: Only Netflix and Spotify display
4. **Expected**: Other subscriptions hidden
5. Click "All" filter
6. **Expected**: All subscriptions reappear

### Test Case C3: Category Edit
1. Click edit on Netflix
2. Change category to "Productivity"
3. Click "Save Changes"
4. **Expected**: Netflix now shows in productivity
5. Click "Entertainment" filter
6. **Expected**: Netflix no longer appears

## Feature 3: Renewal Reminders ✓

### Test Case R1: Renewal Badge Display
1. View subscription list
2. **Expected**: Netflix shows "7d" badge (blue)
3. **Expected**: Spotify shows "5d" badge (yellow)
4. **Expected**: Gym shows "1d" badge (red)

### Test Case R2: Upcoming Renewals List
1. Scroll down in Step 1
2. **Expected**: "Upcoming Renewals (Next 30 Days)" section visible
3. **Expected**: Shows Netflix, Spotify, Gym in order of renewal date
4. **Expected**: Each shows correct days-until count

### Test Case R3: Renewal Notifications
1. Open Subscription modal
2. Check "Remind me before renewal"
3. **Expected**: "Reminder Time" dropdown appears
4. Select "3 days before"
5. Save subscription
6. **Expected**: Reminder days persists on re-edit

### Test Case R4: Past Renewal Recalculation
1. Edit subscription with old start date (e.g., 1 year ago)
2. **Expected**: Renewal date recalculates to future
3. **Expected**: Badge shows correct days

## Feature 4: Spending Trends Analysis ✓

### Test Case T1: Initial Snapshot
1. Open app with test data
2. Navigate to Step 2
3. **Expected**: Trends section visible
4. **Expected**: "Month-over-Month: —" (insufficient data)

### Test Case T2: Manual Snapshot Creation
1. Add new snapshot via localStorage (for testing):
   - Month: 2026-01, Total: $150
   - Month: 2026-02, Total: $187.98
2. Refresh page
3. **Expected**: Month-over-Month shows "↑ 25.3%"
4. **Expected**: Detail shows "+$37.98"

### Test Case T3: Trend Direction
1. Create 3 month history: $100 → $120 → $140
2. Navigate to Step 2
3. **Expected**: 6-Month Trend shows "📈 Increasing"

### Test Case T4: CSV Export
1. With history data, click "Download Trends CSV"
2. **Expected**: File downloads (e.g., `subgrid-trends-2026-02-08.csv`)
3. **Expected**: File contains headers: Month, Total Spending, Subscription Count
4. **Expected**: Data rows match history

## Feature 5: Dark Mode Theme System ✓

### Test Case D1: Theme Toggle
1. Open Settings
2. Click theme toggle button
3. **Expected**: UI switches to dark mode
4. **Expected**: Background becomes #0f172a
5. **Expected**: Text becomes light (#f1f5f9)
6. Click again
7. **Expected**: Returns to light mode

### Test Case D2: Visualization Colors
1. Switch to Dark Mode
2. Go to Step 2
3. **Expected**: Treemap background is dark
4. **Expected**: Text remains readable
5. Switch to Light Mode
6. **Expected**: Original colors restored

### Test Case D3: Theme Persistence
1. Set to Dark Mode
2. Refresh page
3. **Expected**: Stays in Dark Mode
4. Set to Light Mode
5. Refresh page
6. **Expected**: Stays in Light Mode

### Test Case D4: System Preference
1. Clear localStorage
2. Set system preference to dark mode
3. Refresh page in incognito/private
4. **Expected**: App opens in dark mode
5. Change system preference to light
6. **Expected**: App switches to light mode

## Integration Tests ✓

### Test Case I1: All Features Together
1. Set budget: 300 USD
2. Add 5 subscriptions (use test data)
3. Total should show: $187.98
4. Budget bar: ~63% (green)
5. Categories visible in list
6. Renewal badges displayed
7. Trends section shows with 2+ months

### Test Case I2: Data Persistence
1. Add subscriptions, set budget, set theme
2. Close tab completely
3. Reopen app
4. **Expected**: All data preserved (subscriptions, budget, theme, renewals)

### Test Case I3: Mobile Responsiveness
1. shrink browser to 375px width
2. All sections should stack
3. Buttons should be touchable (44x44px minimum)
4. Text should remain readable

# Manual Testing Checklist

- [ ] All features work on mobile (320px, 768px widths)
- [ ] Keyboard navigation works (Tab, Enter, Arrow keys)
- [ ] No console errors in DevTools
- [ ] Data persists after cache clear + reload
- [ ] Budget calculations accurate to ±$0.01
- [ ] Date calculations correct across month/year boundaries
- [ ] Dark mode contrast WCAG AA compliant
- [ ] Visualizations render with 100+ subscriptions
- [ ] CSV exports with correct data and formatting
- [ ] Notifications trigger correctly
- [ ] Theme transitions smooth (no flicker)
- [ ] All icons display correctly
