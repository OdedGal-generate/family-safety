import db from "./index.js";

export function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      pin_hash TEXT,
      avatar_emoji TEXT DEFAULT '👤',
      location_sharing INTEGER DEFAULT 1,
      push_token TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'family' CHECK(type IN ('family', 'sub')),
      owner_id INTEGER NOT NULL REFERENCES users(id),
      parent_group_id INTEGER REFERENCES groups(id),
      depth_level INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member')),
      nickname TEXT,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS group_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      code TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
      max_uses INTEGER DEFAULT 10,
      use_count INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS group_member_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      display_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      self_description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      requested_at TEXT DEFAULT (datetime('now')),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS status_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      group_id INTEGER NOT NULL REFERENCES groups(id),
      status TEXT NOT NULL CHECK(status IN ('safe', 'need_help', 'sos')),
      lat REAL,
      lng REAL,
      address TEXT,
      message TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_status_updates_group ON status_updates(group_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_status_updates_user ON status_updates(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_group_invites_code ON group_invites(code);
    CREATE INDEX IF NOT EXISTS idx_group_invites_token ON group_invites(token);
    CREATE INDEX IF NOT EXISTS idx_group_member_requests_group ON group_member_requests(group_id, status);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
  `);

  // Migration: add pin_hash column to existing databases
  const columns = db.pragma("table_info(users)");
  if (!columns.some((c) => c.name === "pin_hash")) {
    db.exec("ALTER TABLE users ADD COLUMN pin_hash TEXT");
  }

  // Cleanup: drop legacy otp_codes table if it exists
  db.exec("DROP TABLE IF EXISTS otp_codes");
}
