// Tests for Feature 1: Budget Alerts & Thresholds
const fs = require('fs');
const path = require('path');

// Load the budget module
const budgetCode = fs.readFileSync(path.join(__dirname, '../../js/budget.js'), 'utf8');
eval(budgetCode);

// Mock dependencies
global.currencies = {
  USD: { symbol: '$', name: 'US Dollar', rate: 1 },
  EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
  GBP: { symbol: '£', name: 'British Pound', rate: 0.79 }
};

global.selectedCurrency = 'USD';

describe('BudgetManager - Feature 1: Budget Alerts & Thresholds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setBudget', () => {
    test('BC-1: Should successfully set a valid budget', () => {
      const result = BudgetManager.setBudget(1000, 'USD');
      expect(result.success).toBe(true);
    });

    test('BC-2: Should reject negative budget amount', () => {
      const result = BudgetManager.setBudget(-100, 'USD');
      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    test('BC-3: Should reject zero budget amount', () => {
      const result = BudgetManager.setBudget(0, 'USD');
      expect(result.success).toBe(false);
    });

    test('BC-4: Should reject non-numeric budget', () => {
      const result = BudgetManager.setBudget('abc', 'USD');
      expect(result.success).toBe(false);
      expect(result.error).toContain('number');
    });

    test('BC-5: Should reject invalid currency', () => {
      const result = BudgetManager.setBudget(1000, 'XYZ');
      expect(result.success).toBe(false);
      expect(result.error).toContain('currency');
    });

    test('BC-6: Should persist budget to localStorage', () => {
      BudgetManager.setBudget(500, 'EUR');
      const stored = JSON.parse(localStorage.getItem('subgrid_budget'));
      expect(stored.amount).toBe(500);
      expect(stored.currency).toBe('EUR');
    });
  });

  describe('getBudget', () => {
    test('BC-7: Should return null when no budget is set', () => {
      const budget = BudgetManager.getBudget();
      expect(budget).toBeNull();
    });

    test('BC-8: Should retrieve saved budget', () => {
      BudgetManager.setBudget(750, 'GBP');
      const budget = BudgetManager.getBudget();
      expect(budget.amount).toBe(750);
      expect(budget.currency).toBe('GBP');
    });

    test('BC-9: Should handle corrupted localStorage data', () => {
      localStorage.setItem('subgrid_budget', 'invalid json');
      const budget = BudgetManager.getBudget();
      expect(budget).toBeNull();
    });
  });

  describe('removeBudget', () => {
    test('BC-10: Should remove budget from localStorage', () => {
      BudgetManager.setBudget(1000, 'USD');
      BudgetManager.removeBudget();
      expect(BudgetManager.getBudget()).toBeNull();
    });
  });

  describe('calculateUsage', () => {
    test('BC-11: Should return null when no budget is set', () => {
      const subs = [{ price: 100, currency: 'USD', cycle: 'Monthly' }];
      const usage = BudgetManager.calculateUsage(subs, 'USD');
      expect(usage).toBeNull();
    });

    test('BC-12: Should calculate correct usage percentage', () => {
      BudgetManager.setBudget(200, 'USD');
      const subs = [{ price: 100, currency: 'USD', cycle: 'Monthly' }];
      const usage = BudgetManager.calculateUsage(subs, 'USD');
      expect(usage.percentage).toBe(50);
    });

    test('BC-13: Should sum multiple subscriptions', () => {
      BudgetManager.setBudget(300, 'USD');
      const subs = [
        { price: 100, currency: 'USD', cycle: 'Monthly' },
        { price: 100, currency: 'USD', cycle: 'Monthly' },
        { price: 50, currency: 'USD', cycle: 'Monthly' }
      ];
      const usage = BudgetManager.calculateUsage(subs, 'USD');
      expect(usage.total).toBeCloseTo(250, 1);
    });
  });

  describe('getThresholdStatus', () => {
    test('BC-14: Should return "safe" for 0-79%', () => {
      expect(BudgetManager.getThresholdStatus(50)).toBe('safe');
      expect(BudgetManager.getThresholdStatus(79)).toBe('safe');
    });

    test('BC-15: Should return "warning" for 80-89%', () => {
      expect(BudgetManager.getThresholdStatus(80)).toBe('warning');
      expect(BudgetManager.getThresholdStatus(89)).toBe('warning');
    });

    test('BC-16: Should return "caution" for 90-99%', () => {
      expect(BudgetManager.getThresholdStatus(90)).toBe('caution');
      expect(BudgetManager.getThresholdStatus(99)).toBe('caution');
    });

    test('BC-17: Should return "danger" for 100%+', () => {
      expect(BudgetManager.getThresholdStatus(100)).toBe('danger');
      expect(BudgetManager.getThresholdStatus(150)).toBe('danger');
    });
  });

  describe('getThresholdColor', () => {
    test('BC-18: Should return green for safe', () => {
      expect(BudgetManager.getThresholdColor('safe')).toBe('#22c55e');
    });

    test('BC-19: Should return yellow for warning', () => {
      expect(BudgetManager.getThresholdColor('warning')).toBe('#eab308');
    });

    test('BC-20: Should return orange for caution', () => {
      expect(BudgetManager.getThresholdColor('caution')).toBe('#f97316');
    });

    test('BC-21: Should return red for danger', () => {
      expect(BudgetManager.getThresholdColor('danger')).toBe('#ef4444');
    });
  });

  describe('getStatusMessage', () => {
    test('BC-22: Should return appropriate status message', () => {
      expect(BudgetManager.getStatusMessage('safe')).toContain('Within');
      expect(BudgetManager.getStatusMessage('warning')).toContain('Approaching');
      expect(BudgetManager.getStatusMessage('caution')).toContain('Near');
      expect(BudgetManager.getStatusMessage('danger')).toContain('Over');
    });
  });
});
