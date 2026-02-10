// Renewal date tracking and notification management

const ReminderManager = {
  /**
   * Calculate next renewal date based on start date and cycle
   * @param {string} startDate - ISO date string (YYYY-MM-DD)
   * @param {string} cycle - 'Monthly', 'Yearly', or 'Weekly'
   * @returns {string} - Next renewal date as ISO string, or null if invalid
   */
  calculateNextRenewal(startDate, cycle) {
    if (!startDate) return null;

    try {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) return null;

      const today = new Date();
      const nextRenewal = new Date(start);

      // Add cycles until we get a date in the future
      while (nextRenewal <= today) {
        if (cycle === 'Weekly') {
          nextRenewal.setDate(nextRenewal.getDate() + 7);
        } else if (cycle === 'Yearly') {
          nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
        } else {
          // Monthly (default)
          nextRenewal.setMonth(nextRenewal.getMonth() + 1);
        }
      }

      return nextRenewal.toISOString().split('T')[0];
    } catch (err) {
      console.warn('Failed to calculate renewal date:', err);
      return null;
    }
  },

  /**
   * Get subscriptions with upcoming renewals
   * @param {Array} subscriptions - Array of subscription objects
   * @param {number} daysAhead - How many days to look ahead (default 30)
   * @returns {Array} - Subscriptions with upcoming renewals, sorted by date
   */
  getUpcomingRenewals(subscriptions, daysAhead = 30) {
    const upcoming = [];
    const today = new Date();
    const cutoffDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    for (let i = 0; i < subscriptions.length; i++) {
      const sub = subscriptions[i];
      if (!sub.startDate) continue;

      const renewalDate = this.calculateNextRenewal(sub.startDate, sub.cycle);
      if (!renewalDate) continue;

      const renewal = new Date(renewalDate);
      if (renewal > today && renewal <= cutoffDate) {
        upcoming.push({
          ...sub,
          renewalDate: renewalDate,
          daysUntilRenewal: this.getDaysUntilRenewal(renewalDate)
        });
      }
    }

    // Sort by renewal date (soonest first)
    upcoming.sort((a, b) => {
      return new Date(a.renewalDate) - new Date(b.renewalDate);
    });

    return upcoming;
  },

  /**
   * Calculate days until a renewal date
   * @param {string} renewalDate - ISO date string
   * @returns {number} - Number of days until renewal (positive)
   */
  getDaysUntilRenewal(renewalDate) {
    if (!renewalDate) return 0;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const renewal = new Date(renewalDate);
      renewal.setHours(0, 0, 0, 0);

      const timeDiff = renewal - today;
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      return Math.max(0, daysDiff);
    } catch (err) {
      return 0;
    }
  },

  /**
   * Check and show reminders for subscriptions renewing soon
   */
  checkReminders() {
    if (!Notification) return; // Check if browser supports notifications

    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      if (!sub.notificationsEnabled || !sub.startDate) continue;

      const renewalDate = this.calculateNextRenewal(sub.startDate, sub.cycle);
      if (!renewalDate) continue;

      const daysUntil = this.getDaysUntilRenewal(renewalDate);
      const reminderDays = sub.reminderDays || 7;

      // Show notification if renewal is exactly within reminder window
      if (daysUntil === reminderDays && Notification.permission === 'granted') {
        this.showNotification(sub, renewalDate);
      }
    }
  },

  /**
   * Request browser notification permission
   * @returns {Promise<string>} - Permission status: 'granted', 'denied', 'default'
   */
  requestNotificationPermission() {
    if (!Notification) {
      return Promise.resolve('unsupported');
    }

    if (Notification.permission === 'granted') {
      return Promise.resolve('granted');
    }

    if (Notification.permission === 'denied') {
      return Promise.resolve('denied');
    }

    return Notification.requestPermission();
  },

  /**
   * Show browser notification for renewal
   * @param {Object} subscription - Subscription object
   * @param {string} renewalDate - ISO date string
   */
  showNotification(subscription, renewalDate) {
    if (Notification.permission !== 'granted') return;

    try {
      const formattedDate = new Date(renewalDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const priceStr = formatOriginalPrice(subscription);

      new Notification('Renewal Reminder', {
        body: `${subscription.name} renews on ${formattedDate} for ${priceStr}`,
        icon: subscription.url ? `https://www.google.com/s2/favicons?sz=64&domain=${subscription.url}` : undefined,
        tag: `renewal-${subscription.id}`
      });
    } catch (err) {
      console.warn('Failed to show notification:', err);
    }
  },

  /**
   * Get formatted renewal badge text
   * @param {number} daysUntil - Days until renewal
   * @returns {string} - Formatted text for badge
   */
  getRenewalBadgeText(daysUntil) {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `${daysUntil}d`;
  },

  /**
   * Get CSS class for renewal badge based on urgency
   * @param {number} daysUntil - Days until renewal
   * @returns {string} - CSS class name
   */
  getRenewalBadgeClass(daysUntil) {
    if (daysUntil <= 3) return 'renewal-badge-urgent';
    if (daysUntil <= 7) return 'renewal-badge-warning';
    return 'renewal-badge-normal';
  }
};
