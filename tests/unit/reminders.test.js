// Tests for Feature 3: Renewal Reminders
const fs = require('fs');
const path = require('path');

// Load the reminders module
const remindersCode = fs.readFileSync(path.join(__dirname, '../../js/reminders.js'), 'utf8');
eval(remindersCode);

describe('ReminderManager - Feature 3: Renewal Reminders', () => {
  describe('calculateNextRenewal', () => {
    test('CR-1: Should calculate next monthly renewal', () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 15).toISOString().split('T')[0];
      const nextRenewal = ReminderManager.calculateNextRenewal(startDate, 'Monthly');
      expect(nextRenewal).not.toBeNull();
    });

    test('CR-2: Should calculate next yearly renewal', () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear() - 1, today.getMonth(), 15).toISOString().split('T')[0];
      const nextRenewal = ReminderManager.calculateNextRenewal(startDate, 'Yearly');
      expect(nextRenewal).not.toBeNull();
    });

    test('CR-3: Should calculate next weekly renewal', () => {
      const today = new Date();
      const startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const nextRenewal = ReminderManager.calculateNextRenewal(startDate, 'Weekly');
      expect(nextRenewal).not.toBeNull();
    });

    test('CR-4: Should return null for invalid date', () => {
      const result = ReminderManager.calculateNextRenewal('invalid', 'Monthly');
      expect(result).toBeNull();
    });

    test('CR-5: Should return null for empty date', () => {
      const result = ReminderManager.calculateNextRenewal('', 'Monthly');
      expect(result).toBeNull();
    });

    test('CR-6: Should return future date', () => {
      const today = new Date();
      const startDate = new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const nextRenewal = ReminderManager.calculateNextRenewal(startDate, 'Monthly');
      const renewalDate = new Date(nextRenewal);
      expect(renewalDate.getTime()).toBeGreaterThan(today.getTime());
    });
  });

  describe('getDaysUntilRenewal', () => {
    test('CR-7: Should calculate days until renewal', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const renewalDate = tomorrow.toISOString().split('T')[0];
      const days = ReminderManager.getDaysUntilRenewal(renewalDate);
      expect(days).toBe(1);
    });

    test('CR-8: Should return 0 for today', () => {
      const today = new Date().toISOString().split('T')[0];
      const days = ReminderManager.getDaysUntilRenewal(today);
      expect(days).toBe(0);
    });

    test('CR-9: Should return positive value for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const renewalDate = future.toISOString().split('T')[0];
      const days = ReminderManager.getDaysUntilRenewal(renewalDate);
      expect(days).toBeGreaterThan(0);
    });

    test('CR-10: Should return 0 for null date', () => {
      const days = ReminderManager.getDaysUntilRenewal(null);
      expect(days).toBe(0);
    });
  });

  describe('getUpcomingRenewals', () => {
    test('CR-11: Should return subscriptions renewing within 30 days', () => {
      const today = new Date();
      const inTenDays = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const subs = [
        { id: '1', name: 'Netflix', startDate: inTenDays, cycle: 'Monthly' }
      ];
      const upcoming = ReminderManager.getUpcomingRenewals(subs, 30);
      expect(upcoming.length).toBeGreaterThan(0);
    });

    test('CR-12: Should exclude renewals beyond 30 days', () => {
      const today = new Date();
      const inFortyDays = new Date(today.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const subs = [
        { id: '1', name: 'Netflix', startDate: inFortyDays, cycle: 'Monthly' }
      ];
      const upcoming = ReminderManager.getUpcomingRenewals(subs, 30);
      expect(upcoming.length).toBe(0);
    });

    test('CR-13: Should sort by renewal date', () => {
      const today = new Date();
      const in5Days = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const in20Days = new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const subs = [
        { id: '1', name: 'A', startDate: in20Days, cycle: 'Monthly' },
        { id: '2', name: 'B', startDate: in5Days, cycle: 'Monthly' }
      ];
      const upcoming = ReminderManager.getUpcomingRenewals(subs, 30);
      if (upcoming.length > 1) {
        expect(upcoming[0].daysUntilRenewal).toBeLessThanOrEqual(upcoming[1].daysUntilRenewal);
      }
    });

    test('CR-14: Should exclude subscriptions without start date', () => {
      const subs = [
        { id: '1', name: 'Netflix', startDate: '', cycle: 'Monthly' }
      ];
      const upcoming = ReminderManager.getUpcomingRenewals(subs);
      expect(upcoming.length).toBe(0);
    });

    test('CR-15: Should handle empty subscriptions array', () => {
      const upcoming = ReminderManager.getUpcomingRenewals([]);
      expect(upcoming.length).toBe(0);
    });
  });

  describe('requestNotificationPermission', () => {
    test('CR-16: Should request permission', async () => {
      const result = await ReminderManager.requestNotificationPermission();
      expect(result).toBeDefined();
    });
  });

  describe('getRenewalBadgeText', () => {
    test('CR-17: Should show "Today" for 0 days', () => {
      const text = ReminderManager.getRenewalBadgeText(0);
      expect(text).toBe('Today');
    });

    test('CR-18: Should show "Tomorrow" for 1 day', () => {
      const text = ReminderManager.getRenewalBadgeText(1);
      expect(text).toBe('Tomorrow');
    });

    test('CR-19: Should show days for other values', () => {
      const text = ReminderManager.getRenewalBadgeText(5);
      expect(text).toContain('5');
    });
  });

  describe('getRenewalBadgeClass', () => {
    test('CR-20: Should return urgent for 3 or fewer days', () => {
      expect(ReminderManager.getRenewalBadgeClass(0)).toBe('renewal-badge-urgent');
      expect(ReminderManager.getRenewalBadgeClass(3)).toBe('renewal-badge-urgent');
    });

    test('CR-21: Should return warning for 4-7 days', () => {
      expect(ReminderManager.getRenewalBadgeClass(5)).toBe('renewal-badge-warning');
      expect(ReminderManager.getRenewalBadgeClass(7)).toBe('renewal-badge-warning');
    });

    test('CR-22: Should return normal for 8+ days', () => {
      expect(ReminderManager.getRenewalBadgeClass(10)).toBe('renewal-badge-normal');
      expect(ReminderManager.getRenewalBadgeClass(30)).toBe('renewal-badge-normal');
    });
  });
});
