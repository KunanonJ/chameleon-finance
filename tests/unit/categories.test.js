// Tests for Feature 2: Subscription Categories
const fs = require('fs');
const path = require('path');

// Load the categories module
const categoriesCode = fs.readFileSync(path.join(__dirname, '../../js/categories.js'), 'utf8');
eval(categoriesCode);

describe('CategoryManager - Feature 2: Subscription Categories', () => {
  describe('CATEGORIES constant', () => {
    test('CC-1: Should have 6 categories defined', () => {
      const categories = Object.values(CATEGORIES);
      expect(categories.length).toBe(6);
    });

    test('CC-2: Should include entertainment category', () => {
      expect(CATEGORIES.ENTERTAINMENT.id).toBe('entertainment');
    });

    test('CC-3: Should include productivity category', () => {
      expect(CATEGORIES.PRODUCTIVITY.id).toBe('productivity');
    });

    test('CC-4: Should include health category', () => {
      expect(CATEGORIES.HEALTH.id).toBe('health');
    });

    test('CC-5: Should include education category', () => {
      expect(CATEGORIES.EDUCATION.id).toBe('education');
    });

    test('CC-6: Should include utilities category', () => {
      expect(CATEGORIES.UTILITIES.id).toBe('utilities');
    });

    test('CC-7: Should include other category', () => {
      expect(CATEGORIES.OTHER.id).toBe('other');
    });
  });

  describe('suggestCategory', () => {
    test('CC-8: Should suggest entertainment for Netflix', () => {
      const category = CategoryManager.suggestCategory('Netflix');
      expect(category).toBe('entertainment');
    });

    test('CC-9: Should suggest productivity for Notion', () => {
      const category = CategoryManager.suggestCategory('Notion');
      expect(category).toBe('productivity');
    });

    test('CC-10: Should suggest health for Gym', () => {
      const category = CategoryManager.suggestCategory('Gym Membership');
      expect(category).toBe('health');
    });

    test('CC-11: Should suggest education for Coursera', () => {
      const category = CategoryManager.suggestCategory('Coursera');
      expect(category).toBe('education');
    });

    test('CC-12: Should be case insensitive', () => {
      expect(CategoryManager.suggestCategory('netflix')).toBe('entertainment');
      expect(CategoryManager.suggestCategory('SPOTIFY')).toBe('entertainment');
    });

    test('CC-13: Should return other for unknown services', () => {
      const category = CategoryManager.suggestCategory('UnknownService123');
      expect(category).toBe('other');
    });

    test('CC-14: Should handle empty string', () => {
      const category = CategoryManager.suggestCategory('');
      expect(category).toBe('other');
    });
  });

  describe('assignCategory', () => {
    test('CC-15: Should assign category to subscription', () => {
      const subs = [{ id: '1', name: 'Netflix', category: 'other' }];
      CategoryManager.assignCategory(subs, '1', 'entertainment');
      expect(subs[0].category).toBe('entertainment');
    });

    test('CC-16: Should handle non-existent subscription', () => {
      const subs = [{ id: '1', name: 'Netflix' }];
      CategoryManager.assignCategory(subs, '999', 'entertainment');
      expect(subs[0].category).toBeUndefined();
    });
  });

  describe('getByCategory', () => {
    test('CC-17: Should filter subscriptions by category', () => {
      const subs = [
        { id: '1', name: 'Netflix', category: 'entertainment' },
        { id: '2', name: 'Notion', category: 'productivity' },
        { id: '3', name: 'Hulu', category: 'entertainment' }
      ];
      const entertainment = CategoryManager.getByCategory(subs, 'entertainment');
      expect(entertainment.length).toBe(2);
      expect(entertainment[0].name).toBe('Netflix');
    });

    test('CC-18: Should return empty array for non-existent category', () => {
      const subs = [{ id: '1', name: 'Netflix', category: 'entertainment' }];
      const result = CategoryManager.getByCategory(subs, 'other');
      expect(result.length).toBe(0);
    });

    test('CC-19: Should handle empty subscriptions array', () => {
      const result = CategoryManager.getByCategory([], 'entertainment');
      expect(result.length).toBe(0);
    });
  });

  describe('getCategorySpending', () => {
    test('CC-20: Should calculate spending by category', () => {
      const subs = [
        { name: 'Netflix', price: 15, currency: 'USD', cycle: 'Monthly', category: 'entertainment' },
        { name: 'Spotify', price: 12, currency: 'USD', cycle: 'Monthly', category: 'entertainment' },
        { name: 'Notion', price: 10, currency: 'USD', cycle: 'Monthly', category: 'productivity' }
      ];
      const spending = CategoryManager.getCategorySpending(subs, 'USD');
      expect(spending.entertainment.total).toBeCloseTo(27, 1);
      expect(spending.productivity.total).toBeCloseTo(10, 1);
    });

    test('CC-21: Should calculate correct percentages', () => {
      const subs = [
        { name: 'Netflix', price: 30, currency: 'USD', cycle: 'Monthly', category: 'entertainment' },
        { name: 'Notion', price: 20, currency: 'USD', cycle: 'Monthly', category: 'productivity' }
      ];
      const spending = CategoryManager.getCategorySpending(subs, 'USD');
      expect(spending.entertainment.percentage).toBeCloseTo(60, 1);
      expect(spending.productivity.percentage).toBeCloseTo(40, 1);
    });

    test('CC-22: Should count subscriptions per category', () => {
      const subs = [
        { name: 'Netflix', price: 15, currency: 'USD', cycle: 'Monthly', category: 'entertainment' },
        { name: 'Hulu', price: 13, currency: 'USD', cycle: 'Monthly', category: 'entertainment' }
      ];
      const spending = CategoryManager.getCategorySpending(subs, 'USD');
      expect(spending.entertainment.count).toBe(2);
    });
  });
});
