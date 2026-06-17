-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Subscription data for notification checks
CREATE TABLE IF NOT EXISTS tracked_subscriptions (
  id TEXT PRIMARY KEY,
  push_endpoint TEXT NOT NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  cycle TEXT NOT NULL DEFAULT 'Monthly',
  start_date TEXT,
  notifications_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_days INTEGER NOT NULL DEFAULT 7,
  url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (push_endpoint) REFERENCES push_subscriptions(endpoint) ON DELETE CASCADE
);

-- Index for efficient renewal date queries
CREATE INDEX IF NOT EXISTS idx_tracked_subs_notifications
  ON tracked_subscriptions(notifications_enabled, start_date)
  WHERE notifications_enabled = 1;

-- Index for looking up subscriptions by push endpoint
CREATE INDEX IF NOT EXISTS idx_tracked_subs_endpoint
  ON tracked_subscriptions(push_endpoint);

-- Notification log to prevent duplicate sends
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  push_endpoint TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  renewal_date TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(push_endpoint, subscription_id, renewal_date)
);
