-- Moi Manager — Turso / libSQL schema.
--
-- The design, the reasoning behind each table and the verification results are
-- in docs/DATABASE.md. This file is the executable form of that document and
-- the two must be kept in step.
--
-- Money is a whole number of rupees. Dates are TEXT: 'YYYY-MM-DD' for calendar
-- dates, ISO-8601 with 'Z' for instants. Ids are opaque TEXT.
--
-- Foreign keys are NOT enforced unless the connection runs
--   PRAGMA foreign_keys = ON;
-- The client does this on every connection; see src/data/turso/SqlClient.ts.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,            -- Firebase UID
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  photo_url     TEXT,                        -- Google avatar, not our Storage
  village       TEXT,

  -- Collected on the screen after the first Google sign-in.
  -- NULL is the only flag we need for "has not been asked yet".
  phone_country TEXT,                        -- '+91'
  phone         TEXT,                        -- national part, digits only

  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  last_seen_at  TEXT
);

CREATE TABLE app_settings (
  user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  theme               TEXT    NOT NULL DEFAULT 'system'
                                CHECK (theme IN ('system','light','dark')),
  language            TEXT    NOT NULL DEFAULT 'en'
                                CHECK (language IN ('en','ta')),
  hide_amounts_home   INTEGER NOT NULL DEFAULT 0 CHECK (hide_amounts_home IN (0,1)),

  -- Return-moi suggestions (spec §15: a suggestion, never a recommendation).
  suggestion_rounding INTEGER NOT NULL DEFAULT 100 CHECK (suggestion_rounding > 0),
  auspicious_rupee    INTEGER NOT NULL DEFAULT 1 CHECK (auspicious_rupee IN (0,1)),

  notify_upcoming     INTEGER NOT NULL DEFAULT 1 CHECK (notify_upcoming   IN (0,1)),
  notify_tomorrow     INTEGER NOT NULL DEFAULT 1 CHECK (notify_tomorrow   IN (0,1)),
  notify_return_moi   INTEGER NOT NULL DEFAULT 1 CHECK (notify_return_moi IN (0,1)),
  notify_backup       INTEGER NOT NULL DEFAULT 1 CHECK (notify_backup     IN (0,1)),

  updated_at          TEXT NOT NULL
);

CREATE TABLE people (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (TRIM(name) <> ''),
  phone_country TEXT,                     -- "+91" — only meaningful alongside phone
  phone         TEXT,
  village       TEXT,
  relation      TEXT,                     -- "Mama", "Friend", "Neighbour"
  photo_path    TEXT,                     -- Storage path
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT,
  created_by    TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX ix_people_user    ON people(user_id, deleted_at);

CREATE INDEX ix_people_village ON people(user_id, village);

CREATE INDEX ix_people_sync    ON people(user_id, updated_at);

CREATE TABLE functions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (TRIM(title) <> ''),
  type        TEXT NOT NULL CHECK (type IN (
                'wedding','ear_piercing','house_warming','baby_shower','birthday',
                'puberty','upanayanam','engagement','funeral','other')),
  date        TEXT NOT NULL,             -- YYYY-MM-DD
  time        TEXT,                      -- free text, "10:00 AM"
  venue       TEXT,
  village     TEXT,
  host        TEXT,
  notes       TEXT,
  cover_path  TEXT,
  -- The gallery. A JSON array of Storage paths, in display order.
  -- Never filtered or joined on — only read and written whole with the
  -- function — so a child table would buy nothing but a join.
  photo_paths TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(photo_paths)),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  created_by  TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX ix_functions_user ON functions(user_id, deleted_at, date DESC);

CREATE INDEX ix_functions_sync ON functions(user_id, updated_at);

CREATE TABLE person_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  person_id  TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN (
                'wedding','ear_piercing','house_warming','baby_shower','birthday',
                'puberty','upanayanam','engagement','funeral','other')),
  date       TEXT NOT NULL,
  village    TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX ix_pevents_person ON person_events(person_id, deleted_at);

CREATE INDEX ix_pevents_user   ON person_events(user_id, date);

CREATE INDEX ix_pevents_sync   ON person_events(user_id, updated_at);

CREATE TABLE moi (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('received','given')),

  person_id       TEXT NOT NULL REFERENCES people(id)       ON DELETE CASCADE,
  function_id     TEXT REFERENCES functions(id)             ON DELETE CASCADE,
  person_event_id TEXT REFERENCES person_events(id)         ON DELETE SET NULL,
  occasion        TEXT,      -- given, when no person_event was recorded

  amount          INTEGER NOT NULL CHECK (amount > 0),
  payment_type    TEXT NOT NULL CHECK (payment_type IN ('cash','upi','other')),

  entry_date      TEXT NOT NULL,   -- YYYY-MM-DD. Drives every timeline.
  notes           TEXT,
  photo_path      TEXT,

  created_at      TEXT NOT NULL,   -- the instant; orders a function's own list
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT,
  created_by      TEXT NOT NULL REFERENCES users(id),

  -- Received belongs to a function of ours; given does not.
  CHECK (
      (direction = 'received' AND function_id IS NOT NULL
                              AND person_event_id IS NULL AND occasion IS NULL)
   OR (direction = 'given'    AND function_id IS NULL)
  )
);

CREATE INDEX ix_moi_function ON moi(function_id, deleted_at);

CREATE INDEX ix_moi_person   ON moi(person_id, direction, deleted_at);

CREATE INDEX ix_moi_user     ON moi(user_id, direction, entry_date DESC);

CREATE INDEX ix_moi_sync     ON moi(user_id, updated_at);

CREATE TABLE gifts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('received','given')),

  person_id       TEXT NOT NULL REFERENCES people(id)       ON DELETE CASCADE,
  function_id     TEXT REFERENCES functions(id)             ON DELETE CASCADE,
  person_event_id TEXT REFERENCES person_events(id)         ON DELETE SET NULL,
  occasion        TEXT,

  name            TEXT NOT NULL CHECK (TRIM(name) <> ''),
  value           INTEGER CHECK (value IS NULL OR value > 0),

  entry_date      TEXT NOT NULL,
  notes           TEXT,
  photo_path      TEXT,

  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT,
  created_by      TEXT NOT NULL REFERENCES users(id),

  CHECK (
      (direction = 'received' AND function_id IS NOT NULL
                              AND person_event_id IS NULL AND occasion IS NULL)
   OR (direction = 'given'    AND function_id IS NULL)
  )
);

CREATE INDEX ix_gifts_function ON gifts(function_id, deleted_at);

CREATE INDEX ix_gifts_person   ON gifts(person_id, direction, deleted_at);

CREATE INDEX ix_gifts_user     ON gifts(user_id, direction, entry_date DESC);

CREATE INDEX ix_gifts_sync     ON gifts(user_id, updated_at);

CREATE VIEW moi_received AS
  SELECT * FROM moi WHERE direction = 'received' AND deleted_at IS NULL;

CREATE VIEW moi_given AS
  SELECT * FROM moi WHERE direction = 'given'    AND deleted_at IS NULL;

CREATE VIEW gifts_received AS
  SELECT * FROM gifts WHERE direction = 'received' AND deleted_at IS NULL;

CREATE VIEW gifts_given AS
  SELECT * FROM gifts WHERE direction = 'given'    AND deleted_at IS NULL;

CREATE TABLE expenses (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  function_id  TEXT NOT NULL REFERENCES functions(id) ON DELETE CASCADE,
  category     TEXT NOT NULL CHECK (category IN (
                 'food','decoration','hall','travel','photography','invitation',
                 'clothing','music','gifts','transport','other')),
  amount       INTEGER NOT NULL CHECK (amount > 0),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('cash','upi','other')),
  paid_by      TEXT,
  date         TEXT NOT NULL,
  notes        TEXT,
  receipt_path TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  created_by   TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX ix_expenses_function ON expenses(function_id, deleted_at);

CREATE INDEX ix_expenses_sync     ON expenses(user_id, updated_at);

CREATE TABLE function_shares (
  id           TEXT PRIMARY KEY,
  function_id  TEXT NOT NULL REFERENCES functions(id) ON DELETE CASCADE,
  owner_id     TEXT NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,  -- NULL until they join
  invite_phone TEXT,                                          -- how they are found
  role         TEXT NOT NULL CHECK (role IN ('collector','editor','viewer')),
  status       TEXT NOT NULL CHECK (status IN ('pending','accepted','revoked')),
  created_at   TEXT NOT NULL,
  accepted_at  TEXT,
  CHECK (user_id IS NOT NULL OR invite_phone IS NOT NULL)
);

CREATE UNIQUE INDEX ux_share_user  ON function_shares(function_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX ux_share_phone ON function_shares(function_id, invite_phone)
  WHERE invite_phone IS NOT NULL;

CREATE INDEX ix_share_inbox ON function_shares(user_id, status);

CREATE VIEW function_access AS
  SELECT id AS function_id, user_id, 'owner' AS role
    FROM functions WHERE deleted_at IS NULL
  UNION ALL
  SELECT function_id, user_id, role
    FROM function_shares
   WHERE status = 'accepted' AND user_id IS NOT NULL;
