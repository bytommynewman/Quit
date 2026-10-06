// SQLite schema for the quit tracker. One user, one device, no server.
// Mirrors the Postgres design so a sync layer can be added later without
// changing the app: booleans are 0/1 integers, arrays/objects are JSON text,
// timestamps are ISO-8601 strings, dates are YYYY-MM-DD.

export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS quit_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  method TEXT NOT NULL DEFAULT 'cold_turkey',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  baseline_use TEXT,
  baseline_cost_cents_per_week INTEGER NOT NULL DEFAULT 0,
  reasons TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slips (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES quit_attempts(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  trigger TEXT,
  trigger_tags TEXT NOT NULL DEFAULT '[]',
  severity INTEGER,
  support_used INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS slips_attempt_idx ON slips (attempt_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS withdrawal_checkins (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES quit_attempts(id) ON DELETE CASCADE,
  checkin_date TEXT NOT NULL,
  sleep_hours REAL,
  sleep_quality INTEGER,
  appetite INTEGER,
  mood INTEGER,
  anxiety INTEGER,
  irritability INTEGER,
  energy INTEGER,
  craving_peak INTEGER,
  vivid_dreams INTEGER NOT NULL DEFAULT 0,
  night_sweats INTEGER NOT NULL DEFAULT 0,
  headache INTEGER NOT NULL DEFAULT 0,
  nausea INTEGER NOT NULL DEFAULT 0,
  meals_count INTEGER,
  ate_breakfast INTEGER NOT NULL DEFAULT 0,
  worked_out INTEGER NOT NULL DEFAULT 0,
  got_outside INTEGER NOT NULL DEFAULT 0,
  used_cannabis INTEGER NOT NULL DEFAULT 0,
  nicotine_level INTEGER,
  drinks_count INTEGER,
  cws_items TEXT,
  cws_total INTEGER,
  cws_interference INTEGER,
  win TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (attempt_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS cravings (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES quit_attempts(id) ON DELETE CASCADE,
  occurred_at TEXT NOT NULL,
  intensity INTEGER NOT NULL,
  hungry INTEGER NOT NULL DEFAULT 0,
  angry INTEGER NOT NULL DEFAULT 0,
  lonely INTEGER NOT NULL DEFAULT 0,
  tired INTEGER NOT NULL DEFAULT 0,
  trigger_tags TEXT NOT NULL DEFAULT '[]',
  context TEXT,
  coping_action TEXT,
  coping_tool_id TEXT,
  duration_minutes INTEGER,
  outcome TEXT,
  intensity_after INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS cravings_attempt_idx ON cravings (attempt_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS coping_tools (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  minutes INTEGER NOT NULL DEFAULT 10,
  setting TEXT NOT NULL DEFAULT 'anywhere',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  times_used INTEGER NOT NULL DEFAULT 0,
  helpful_votes INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS if_then_plans (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT,
  situation TEXT NOT NULL,
  response TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  times_triggered INTEGER NOT NULL DEFAULT 0,
  times_held INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quit_milestones (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_id TEXT NOT NULL REFERENCES quit_attempts(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  what_to_expect TEXT,
  reward TEXT,
  reached_at TEXT,
  reward_claimed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (attempt_id, day_number)
);

CREATE TABLE IF NOT EXISTS support_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  text_ok INTEGER NOT NULL DEFAULT 1,
  late_night_ok INTEGER NOT NULL DEFAULT 0,
  knows TEXT NOT NULL DEFAULT 'none',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
