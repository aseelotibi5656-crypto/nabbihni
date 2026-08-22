-- ---------------------------------------------------------------------------
--  نَبّهني — مخطط قاعدة البيانات
-- ---------------------------------------------------------------------------
--  المحرك الحالي: SQLite (عبر node:sqlite المدمج في Node 22+، بدون أي تبعيات
--  أصلية). المخطط مكتوب بـ SQL قياسي قدر الإمكان ليسهل نقله إلى PostgreSQL:
--    TEXT PRIMARY KEY  -> UUID / TEXT
--    INTEGER (0|1)     -> BOOLEAN
--    TEXT (ISO 8601)   -> TIMESTAMPTZ
--  انظر docs/DATABASE.md لخريطة الترحيل الكاملة.
--
--  قواعد عامة:
--  * كل الأوقات مخزّنة بـ UTC بصيغة ISO-8601، والعرض يتم بتوقيت المستخدم.
--  * كل جدول يحتوي على user_id لعزل بيانات المستخدمين (Row Ownership).
--  * الحذف المتتالي ON DELETE CASCADE يضمن عدم بقاء بيانات يتيمة.
-- ---------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-- ============================ المستخدمون والحسابات ============================

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL,
  avatar_url     TEXT,
  email_verified TEXT,
  locale         TEXT NOT NULL DEFAULT 'ar',
  timezone       TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  plan           TEXT NOT NULL DEFAULT 'free',   -- free | pro | business
  role           TEXT NOT NULL DEFAULT 'user',   -- user | admin
  last_login_at  TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS sessions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash     TEXT NOT NULL UNIQUE,
  user_agent     TEXT,
  ip             TEXT,
  expires_at     TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  last_active_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- رموز مؤقتة لتفعيل البريد وإعادة تعيين كلمة المرور (تُخزَّن مُجزّأة hashed)
CREATE TABLE IF NOT EXISTS verification_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL,           -- email_verification | password_reset
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vtokens_user_type ON verification_tokens(user_id, type);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id                  TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme                    TEXT    NOT NULL DEFAULT 'system',   -- light | dark | system
  accent_color             TEXT    NOT NULL DEFAULT 'indigo',
  week_starts_on           INTEGER NOT NULL DEFAULT 0,          -- 0 = الأحد
  time_format              TEXT    NOT NULL DEFAULT '12',       -- 12 | 24
  default_view             TEXT    NOT NULL DEFAULT 'week',     -- day | week | month | year
  push_enabled             INTEGER NOT NULL DEFAULT 1,
  email_enabled            INTEGER NOT NULL DEFAULT 0,
  sound_enabled            INTEGER NOT NULL DEFAULT 1,
  daily_digest             INTEGER NOT NULL DEFAULT 1,
  digest_time              TEXT    NOT NULL DEFAULT '08:00',
  quiet_hours_enabled      INTEGER NOT NULL DEFAULT 0,
  quiet_hours_start        TEXT    NOT NULL DEFAULT '23:00',
  quiet_hours_end          TEXT    NOT NULL DEFAULT '07:00',
  default_reminder_offsets TEXT    NOT NULL DEFAULT '10',       -- CSV بالدقائق
  smart_reminders_enabled  INTEGER NOT NULL DEFAULT 1,
  smart_reschedule_enabled INTEGER NOT NULL DEFAULT 1,
  analytics_opt_in         INTEGER NOT NULL DEFAULT 1,
  profile_public           INTEGER NOT NULL DEFAULT 0,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

-- ================================ المساحات =================================
-- جاهزة لميزة المشاركة والفرق: لكل مستخدم مساحة شخصية تُنشأ تلقائياً.

CREATE TABLE IF NOT EXISTS workspaces (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_personal INTEGER NOT NULL DEFAULT 1,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member',   -- owner | admin | member
  invited_by   TEXT,
  joined_at    TEXT NOT NULL,
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_wsmembers_user ON workspace_members(user_id);

-- =============================== التصنيفات ================================

CREATE TABLE IF NOT EXISTS categories (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT 'indigo',
  icon         TEXT NOT NULL DEFAULT 'folder',
  is_system    INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- ================================= المهام =================================

CREATE TABLE IF NOT EXISTS tasks (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id         TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  category_id          TEXT REFERENCES categories(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  description          TEXT,
  notes                TEXT,
  due_at               TEXT,                             -- UTC ISO-8601
  all_day              INTEGER NOT NULL DEFAULT 0,
  duration_min         INTEGER,
  priority             TEXT NOT NULL DEFAULT 'medium',   -- low | medium | high | urgent
  status               TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | archived
  completed_at         TEXT,
  rescheduled_from     TEXT,
  reschedule_count     INTEGER NOT NULL DEFAULT 0,
  is_recurring         INTEGER NOT NULL DEFAULT 0,
  recurrence_rule      TEXT,                             -- JSON RecurrenceRule
  recurrence_parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  occurrence_date      TEXT,                             -- YYYY-MM-DD (لنسخ التكرار)
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(recurrence_parent_id);

CREATE TABLE IF NOT EXISTS attachments (
  id         TEXT PRIMARY KEY,
  task_id    TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  mime_type  TEXT NOT NULL,
  size       INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_attachments_task ON attachments(task_id);

-- ================================ المواعيد ================================

CREATE TABLE IF NOT EXISTS events (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id    TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  location        TEXT,
  start_at        TEXT NOT NULL,
  end_at          TEXT NOT NULL,
  all_day         INTEGER NOT NULL DEFAULT 0,
  color           TEXT NOT NULL DEFAULT 'indigo',
  is_recurring    INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_start ON events(user_id, start_at);

-- =============================== التذكيرات ================================

CREATE TABLE IF NOT EXISTS reminders (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id        TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  event_id       TEXT REFERENCES events(id) ON DELETE CASCADE,
  habit_id       TEXT REFERENCES habits(id) ON DELETE CASCADE,
  offset_minutes INTEGER NOT NULL DEFAULT 0,
  trigger_at     TEXT NOT NULL,                       -- UTC ISO-8601
  channel        TEXT NOT NULL DEFAULT 'push',        -- push | email | inapp | whatsapp
  status         TEXT NOT NULL DEFAULT 'scheduled',   -- scheduled | sent | failed | cancelled | dismissed
  sent_at        TEXT,
  attempts       INTEGER NOT NULL DEFAULT 0,
  last_error     TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reminders_dispatch ON reminders(status, trigger_at);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id, trigger_at);

-- ================================ العادات =================================

CREATE TABLE IF NOT EXISTS habits (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id      TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  category_id       TEXT REFERENCES categories(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  icon              TEXT NOT NULL DEFAULT 'sparkles',
  color             TEXT NOT NULL DEFAULT 'emerald',
  frequency         TEXT NOT NULL DEFAULT 'daily',   -- daily | custom_days | times_per_week
  target_days       TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
  target_per_period INTEGER NOT NULL DEFAULT 1,
  unit              TEXT NOT NULL DEFAULT 'مرة',
  time_of_day       TEXT,
  is_archived       INTEGER NOT NULL DEFAULT 0,
  start_date        TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id);

CREATE TABLE IF NOT EXISTS habit_logs (
  id         TEXT PRIMARY KEY,
  habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,                 -- YYYY-MM-DD بتوقيت المستخدم
  value      INTEGER NOT NULL DEFAULT 1,
  completed  INTEGER NOT NULL DEFAULT 1,
  note       TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (habit_id, date)
);
CREATE INDEX IF NOT EXISTS idx_habitlogs_user_date ON habit_logs(user_id, date);

-- =============================== الإشعارات ================================

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,     -- reminder | digest | system | reschedule | streak
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       TEXT,              -- JSON
  link       TEXT,
  read_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ============================== المساعد الذكي ==============================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'محادثة جديدة',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aiconv_user ON ai_conversations(user_id);

CREATE TABLE IF NOT EXISTS ai_messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,   -- user | assistant | system
  content         TEXT NOT NULL,
  intent          TEXT,            -- JSON: { intent, entities, confidence }
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aimsg_conv ON ai_messages(conversation_id);

-- =========================== حدود المعدّل (Rate Limit) ======================

CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT PRIMARY KEY,
  count       INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);
