// Category management system for subscriptions

const CATEGORIES = {
  ENTERTAINMENT: {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'ph:film',
    color: '#E5DEFF'
  },
  PRODUCTIVITY: {
    id: 'productivity',
    name: 'Productivity',
    icon: 'ph:briefcase',
    color: '#C6F6F6'
  },
  HEALTH: {
    id: 'health',
    name: 'Health & Fitness',
    icon: 'ph:heart',
    color: '#FFDCC2'
  },
  EDUCATION: {
    id: 'education',
    name: 'Education',
    icon: 'ph:book',
    color: '#FFF4C3'
  },
  UTILITIES: {
    id: 'utilities',
    name: 'Utilities',
    icon: 'ph:lightning',
    color: '#E0E7FF'
  },
  OTHER: {
    id: 'other',
    name: 'Other',
    icon: 'ph:dots-three',
    color: '#F1F5F9'
  }
};

// Keyword mappings for auto-suggestion
const CATEGORY_KEYWORDS = {
  entertainment: [
    'netflix', 'hulu', 'disney', 'prime', 'amazon', 'max', 'hbo',
    'spotify', 'apple music', 'youtube', 'twitch', 'tiktok', 'instagram',
    'spotify', 'soundcloud', 'deezer', 'pandora',
    'ps plus', 'xbox', 'gamepass', 'steam', 'epic', 'playstation',
    'cinema', 'movie', 'series', 'film', 'show', 'music', 'song',
    'podcast', 'audible', 'scribd'
  ],
  productivity: [
    'notion', 'slack', 'figma', 'adobe', 'creative cloud',
    'github', 'gitlab', 'jira', 'asana', 'monday',
    'zoom', 'slack', 'teams', 'discord', 'telegram',
    'drive', 'dropbox', 'onedrive', 'icloud',
    'copilot', 'chatgpt', 'claude', 'gemini', 'perplexity', 'openai',
    'office', 'microsoft', '365', 'gsuite', 'google workspace',
    'vercel', 'netlify', 'heroku', 'railway', 'render',
    'code', 'editor', 'ide', 'jetbrains', 'vscode'
  ],
  health: [
    'gym', 'fitness', 'peloton', 'applegatch', 'apple fitness',
    'strava', 'garmin', 'fitbit', 'oura', 'whoop',
    'headspace', 'calm', 'insight timer', 'meditation',
    'gold gym', 'la fitness', 'anytime fitness', 'planet fitness',
    'yoga', 'pilates', 'weightlifting', 'running', 'cycling',
    'health', 'wellness', 'medical', 'insurance', 'telemedicine',
    'doctor', 'therapy', 'mental', 'nurse', 'clinic'
  ],
  education: [
    'coursera', 'udemy', 'skillshare', 'masterclass',
    'duolingo', 'babbel', 'rosetta', 'pluralsight',
    'codecademy', 'treehouse', 'thinkful', 'bootcamp',
    'khan academy', 'educative', 'egghead', 'scrimba',
    'class', 'course', 'learn', 'school', 'university',
    'education', 'training', 'tutorial', 'lesson'
  ],
  utilities: [
    'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify',
    'stripe', 'paypal', 'square', 'shopify',
    'sendgrid', 'mailgun', 'twilio', 'vonage',
    'datadog', 'sentry', 'new relic', 'cloudflare',
    'vpn', 'nordvpn', 'expressvpn', 'surfshark',
    'server', 'hosting', 'cloud', 'infrastructure', 'api'
  ]
};

const CategoryManager = {
  /**
   * Assign a category to a subscription
   * @param {string} subscriptionId - The ID of the subscription
   * @param {string} categoryId - The category ID
   * @returns {Object} - {success: boolean, error?: string}
   */
  assignCategory(subscriptionId, categoryId) {
    if (!Object.values(CATEGORIES).find(c => c.id === categoryId)) {
      return { success: false, error: 'Invalid category' };
    }

    const sub = subs.find(s => s.id === subscriptionId);
    if (!sub) {
      return { success: false, error: 'Subscription not found' };
    }

    sub.category = categoryId;
    save();
    return { success: true };
  },

  /**
   * Get all subscriptions in a category
   * @param {Array} subscriptions - Array of subscriptions
   * @param {string} categoryId - The category ID
   * @returns {Array} - Filtered subscriptions
   */
  getByCategory(subscriptions, categoryId) {
    if (categoryId === 'all') {
      return subscriptions;
    }
    return subscriptions.filter(s => (s.category || 'other') === categoryId);
  },

  /**
   * Calculate total spending per category
   * @param {Array} subscriptions - Array of subscriptions
   * @param {string} selectedCurrency - The selected currency for conversion
   * @returns {Object} - Category spending breakdown
   */
  getCategorySpending(subscriptions, selectedCurrency) {
    const result = {};

    // Initialize each category with 0 values
    Object.values(CATEGORIES).forEach(cat => {
      result[cat.id] = {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        total: 0,
        count: 0,
        percentage: 0
      };
    });

    // Sum totals
    let grandTotal = 0;
    subscriptions.forEach(sub => {
      const category = sub.category || 'other';
      const monthlyAmount = toMonthly(sub, selectedCurrency);

      result[category].total += monthlyAmount;
      result[category].count += 1;
      grandTotal += monthlyAmount;
    });

    // Calculate percentages
    if (grandTotal > 0) {
      Object.values(result).forEach(cat => {
        cat.percentage = (cat.total / grandTotal) * 100;
      });
    }

    return result;
  },

  /**
   * Auto-suggest a category based on subscription name
   * @param {string} subscriptionName - The name of the subscription
   * @returns {string} - Category ID
   */
  suggestCategory(subscriptionName) {
    const lowerName = subscriptionName.toLowerCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          return category;
        }
      }
    }

    return 'other';
  }
};
