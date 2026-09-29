# Moi Manager — database design

Firebase Authentication (Google only) for identity, **Turso / libSQL** for data,
**Firebase Storage** for photos.

Nothing here is implemented yet. This document is the proposal to review.

## Decisions taken

| | |
|---|---|
| Scope key | `user_id` — one moi book, one owner. No households. |
| Sharing | Not built. The schema and every query are shaped so per-function sharing drops in with **no migration**. |
| Offline | **Read-only.** Cached rows can be viewed; add / edit / delete need a connection. |
| Photos | Firebase Storage. The database keeps the object path, never the bytes. |
| Money | `INTEGER`, whole rupees. Never a float. |
| Dates | `TEXT`. `YYYY-MM-DD` for calendar dates, ISO-8601 with `Z` for instants. |
| Deletes | Soft (`deleted_at`). Tombstones are what let an offline cache learn a row is gone. |

Dropped from the app's current model: `families` (the Family Group feature was
removed from the UI) and `family_members` (superseded by `function_shares`).

## Table list

| # | Table | Purpose |
|---|---|---|
| 1 | `users` | One row per Google account. Identity, profile, mobile number. |
| 2 | `app_settings` | Preferences, one row per user. 1:1 with `users`. |
| 3 | `people` | The contact book — everyone who has ever given or been given. |
| 4 | `functions` | Functions **we** host. Moi comes in here. |
| 5 | `person_events` | Functions **they** host. What we owe a return at. |
| 6 | `moi` | Cash, both directions. |
| 7 | `gifts` | Things, both directions. |
| 8 | `expenses` | What a function of ours cost. |
| 9 | `function_shares` | Dormant. Created now so sharing needs no migration later. |

Moi and gifts are kept apart in the database exactly as they are in the UI.
Neither table can hold the other's shape: `moi.amount` is `NOT NULL` and can
only ever mean rupees; `gifts.value` is nullable and never enters a total.
Four views strip the soft-deleted rows off each direction.

## Relationships

```
users ─┬─── app_settings                  (1:1)
       │
       ├──< people ───────────< person_events
       │       │                       │
       │       │   ┌───────────────────┘
       │       ▼   ▼
       ├──<   moi   >──┐
       │               ├── functions ──< expenses
       ├──<  gifts  >──┘       │
       │                       │
       └───────────────────────┴──< function_shares   (dormant)
```

* `users 1─1 app_settings` — `user_id` is the settings table's primary key,
  so a duplicate settings row cannot exist.
* `users 1─N people` — a contact belongs to exactly one book.
* `people 1─N person_events` — their weddings, house warmings.
* `moi N─1 people` and `gifts N─1 people` — always. Every record names a person.
* `moi N─1 functions` and `gifts N─1 functions` — **received** only. What came
  to us, at a function of ours.
* `moi N─1 person_events` and `gifts N─1 person_events` — **given** only, and
  optional. Free-text `occasion` covers something given with no event recorded.
* `functions 1─N expenses`.
* Every table carries `user_id` directly, so isolation is one indexed predicate
  and never depends on getting a join right.

## Schema

libSQL does not enforce foreign keys unless asked. Every connection must run
`PRAGMA foreign_keys = ON;` or none of the `ON DELETE CASCADE` rules below fire.

### 1. users

Identity and profile only — who this person is. Nothing here changes because
they flipped a switch in Settings.

```sql
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

-- One account per number: what invite-by-phone will resolve against later.
CREATE UNIQUE INDEX ux_users_phone
  ON users(phone_country, phone) WHERE phone IS NOT NULL;
```

### 2. app_settings

Preferences, one row per user. Separate from `users` so that adding a
preference never touches the identity table, and so a settings write never
risks a profile column.

`user_id` is both the primary key and the foreign key, which is what makes the
1:1 real: a second settings row for the same user is not storable.

```sql
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
```

Two consequences of the split that the API has to handle:

1. **The row must be created with the user.** A `LEFT JOIN` onto a missing row
   yields `NULL`, not the column defaults — so a user with no settings row
   would read as "no theme, no language", not as "the defaults". Insert both
   rows in one transaction at sign-up, and have the settings read upsert the
   defaults if it ever finds nothing.
2. **`theme` is still needed before the first network call**, or the app paints
   the wrong palette for a moment on launch. It stays cached on the device and
   is read from there first; this table is the source of truth that follows.

### 3. people

```sql
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
```

### 4. functions

```sql
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
```

### 5. person_events

```sql
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
```

### 6. moi

Cash, in both directions. `amount` here can only ever mean rupees that count
toward a total — no other kind of number is storable in this table.

```sql
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
```

### 7. gifts

The same shape, for things rather than cash. Two differences carry the whole
distinction, and neither is expressible in the `moi` table:

* `name` is required — a gift is remembered as "the silver bowl".
* `value` is **nullable**. A gift with no price is not a gift worth nothing;
  the host simply never said. `0` is not an acceptable stand-in, and the
  `CHECK` refuses it.

There is no `payment_type` here at all. A gift is not paid.

```sql
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
```

### Why `direction` stayed a column

Splitting once more — `moi_received` / `moi_given` / `gifts_received` /
`gifts_given` as four physical tables — would match the TypeScript interfaces
one-for-one, but it buys nothing the `CHECK` above does not already guarantee,
and it costs a `UNION` on every screen that shows both directions at once:
the person's moi history, the gift timeline, the return-due report. Those are
the app's most-used queries. `direction` stays a column.

### Convenience views

Now that no column is overloaded these are ordinary conveniences rather than a
safety net — they exist to keep `deleted_at IS NULL` out of every query.

```sql
CREATE VIEW moi_received AS
  SELECT * FROM moi WHERE direction = 'received' AND deleted_at IS NULL;
CREATE VIEW moi_given AS
  SELECT * FROM moi WHERE direction = 'given'    AND deleted_at IS NULL;
CREATE VIEW gifts_received AS
  SELECT * FROM gifts WHERE direction = 'received' AND deleted_at IS NULL;
CREATE VIEW gifts_given AS
  SELECT * FROM gifts WHERE direction = 'given'    AND deleted_at IS NULL;
```

### 8. expenses

```sql
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
```

### 9. function_shares — created, not used

Built now and left empty. The UI shows only a "coming soon" tooltip. When
sharing ships, no existing table changes.

```sql
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
```

`collector` is the role that matters: the person at the moi table with the
notebook. They may add moi and gifts to that one function and see nothing else —
not the expenses, not the contact book, not anyone's balance.

## Writing today's code so sharing needs no rewrite

The trap is scattering `WHERE user_id = ?` through a hundred queries, because
every one of them becomes an edit the day sharing arrives. One view absorbs
that change instead.

```sql
-- Today: an owner sees their own functions. Nothing else exists.
CREATE VIEW function_access AS
  SELECT id AS function_id, user_id, 'owner' AS role
    FROM functions
   WHERE deleted_at IS NULL;
```

Every function-scoped read goes through it from day one:

```sql
SELECT f.* FROM functions f
  JOIN function_access a ON a.function_id = f.id
 WHERE a.user_id = :me AND f.deleted_at IS NULL
 ORDER BY f.date DESC;
```

The day sharing ships, the view gains a second branch and **not one query
changes**:

```sql
CREATE VIEW function_access AS
  SELECT id AS function_id, user_id, 'owner' AS role
    FROM functions WHERE deleted_at IS NULL
  UNION ALL
  SELECT function_id, user_id, role
    FROM function_shares
   WHERE status = 'accepted' AND user_id IS NOT NULL;
```

Three more habits cost nothing now and are required later:

1. `created_by` on every row, always set — today it equals `user_id`, later it
   records which collector wrote the entry.
2. A row created inside a function is owned by the **function's** owner, never
   by whoever typed it. Set `user_id` from the function, not from the session.
3. The API never accepts a `user_id` from the client. It comes from the verified
   Firebase token, every time.

## Isolation

libSQL has **no row-level security**. There is no equivalent of a Postgres
policy; the database will hand over any row asked for. Isolation is entirely
the API layer's job.

* The app never holds Turso credentials. It talks to an API (Cloudflare Workers
  sits closest to Turso and is the cheapest fit); the API holds the token.
* Every request carries a Firebase ID token. The API verifies it and derives
  `user_id` from the claims.
* Every read filters on `user_id` or goes through `function_access`.
* Every write re-checks that the parent row belongs to the caller before
  inserting — otherwise an expense can be posted into someone else's function
  by guessing an id.

## Authentication flow

```
Google sign-in (Firebase)  →  ID token  →  API verifies  →  uid
        │
   SELECT phone FROM users WHERE id = uid
        │
   ├── no row ──→ INSERT users (phone NULL)  ──→  /auth/phone   → Home
   ├── phone NULL ────────────────────────────→  /auth/phone   → Home
   └── phone set ─────────────────────────────────────────────→ Home
```

`users.phone IS NULL` is the entire "first time" test. No separate flag, no way
for the two to disagree.

## Photos — Firebase Storage

The database stores a path; the bytes live in Storage. Paths are laid out so
every rule is a prefix match and a deleted user's files can be swept in one go.

```
users/{uid}/people/{person_id}/{photo_id}.jpg
users/{uid}/functions/{function_id}/cover.jpg
users/{uid}/functions/{function_id}/gallery/{photo_id}.jpg
users/{uid}/moi/{moi_id}/{photo_id}.jpg
users/{uid}/gifts/{gift_id}/{photo_id}.jpg
users/{uid}/expenses/{expense_id}/receipt.jpg
```

```
match /users/{uid}/{rest=**} {
  allow read, write: if request.auth.uid == uid;
}
```

Deleting a row must also delete its objects — Storage has no foreign keys, and
orphaned images are billed forever. The API should sweep on delete, with a
scheduled job as the backstop.

Today every photo is an `ImagePicker` `file://` URI that never leaves the phone.
Migrating is a real piece of work: upload on save, show the local file while it
uploads, keep the remote URL after.

## Offline — read only

Confirmed scope: **cached rows are viewable; add, edit and delete require a
connection.** That removes the hard half of offline entirely — there is no
merge, no conflict, no write queue.

```
online   →  pull changes  →  local cache  →  screens read the cache
offline  →                   local cache  →  screens read the cache (read-only)
```

Pull:

```sql
SELECT * FROM app_settings WHERE user_id = :me AND updated_at > :cursor;
SELECT * FROM people   WHERE user_id = :me AND updated_at > :cursor;
SELECT * FROM functions WHERE user_id = :me AND updated_at > :cursor;
SELECT * FROM moi       WHERE user_id = :me AND updated_at > :cursor;
SELECT * FROM gifts     WHERE user_id = :me AND updated_at > :cursor;
...
```

* `updated_at` must be set by the **server**, never the client — a phone with a
  wrong clock would otherwise make its own rows invisible to the next pull.
* The next cursor is the **highest `updated_at` in the response**, not "now".
  Taking "now" loses any row written while the response was in flight.
* Deletes arrive as rows with `deleted_at` set. Without the tombstone the cache
  would keep showing something the user deleted on another device. This is why
  nothing is hard-deleted.
* The cache stores rows as they arrive; the existing selectors run over it
  unchanged.

Storage per platform: IndexedDB on web, `expo-sqlite` on iOS and Android.

### Read-only mode in the UI

Offline must be visible, not a dead button. Every Add button, the tab-bar `+`,
Edit, Delete and Save need one shared disabled state plus a banner — and the
same check on the data layer, so a screen that forgets the banner still cannot
write.

## Soft delete — why `deleted_at` exists

Six tables carry `deleted_at`: `people`, `functions`, `person_events`, `moi`,
`gifts`, `expenses`. `users`, `app_settings` and `function_shares` do not —
those are removed for real.

### The reason is the offline cache

A delta pull asks "what changed since my last sync?":

```sql
SELECT * FROM moi WHERE user_id = :me AND updated_at > :cursor;
```

A hard-deleted row cannot answer that question. It is simply absent, which is
indistinguishable from "nothing changed" — so the phone keeps showing a moi
entry that was deleted a month ago, and its total stays wrong forever. There is
no query that returns rows which no longer exist.

A soft delete turns the deletion into a *change*, which the same pull carries:

| | what the next pull returns | what the cache does |
|---|---|---|
| hard delete | nothing | keeps showing ₹1000 that was deleted |
| soft delete | the row, with `deleted_at` set | drops it, total corrects |

That row is the tombstone. It is the only way a cache learns something is gone.

### Second reason: money, and a busy moi table

Entries are typed at speed with a queue of guests waiting. A mistyped delete is
a real event, and `deleted_at` makes Undo a one-column update instead of
re-entering what nobody remembers.

### The trap: a soft delete does not cascade

`ON DELETE CASCADE` fires on a real `DELETE`. It does nothing when a row is
merely stamped — so soft-deleting a function on its own leaves its children
live and visible:

```
Functions list:                    0   (hidden, correct)
All Moi Entries:  2 entries, ₹3000     (still there — wrong)
Home total:                    ₹3000   (still counting a deleted function)
```

Every soft delete must stamp its children in the same transaction:

```sql
BEGIN;
  UPDATE moi      SET deleted_at = :now, updated_at = :now
    WHERE function_id = :id AND deleted_at IS NULL;
  UPDATE gifts    SET deleted_at = :now, updated_at = :now
    WHERE function_id = :id AND deleted_at IS NULL;
  UPDATE expenses SET deleted_at = :now, updated_at = :now
    WHERE function_id = :id AND deleted_at IS NULL;
  UPDATE functions SET deleted_at = :now, updated_at = :now WHERE id = :id;
COMMIT;
```

Verified: totals go to zero and 2 tombstones are queued for the next pull.
Deleting a person is the same shape, over `moi`, `gifts` and `person_events`.

The `ON DELETE CASCADE` rules in the schema stay for the one case that really
is a hard delete — closing an account, which removes the `users` row and lets
every table drain behind it.

### Retention

Tombstones accumulate. A moi book is small — a heavy user has a few thousand
entries — so keeping them indefinitely is fine for now. If it ever isn't, they
can be purged past the point where no device could still be that far behind,
which means tracking each device's sync cursor first.

## PWA notes — the awkward parts

* **iOS evicts storage.** Safari clears IndexedDB after roughly 7 days without
  a visit, unless the app is installed to the home screen. An uninstalled PWA
  will sometimes open offline with nothing cached; the empty state has to say
  so honestly rather than look like data loss.
* **Google sign-in differs by platform.** `signInWithPopup` on web,
  `expo-auth-session` with a native Google provider on iOS and Android. Two
  adapters behind the existing `AuthSource` port.
* **Push on iOS** only works once the PWA is installed to the home screen
  (iOS 16.4+). The notification settings need to reflect that.
* **Photos offline** are only viewable if their bytes were cached. Firebase
  Storage URLs are not cached by default — the service worker needs a rule, and
  it should be capped so the cache does not grow without limit.

## Open items

* Migrating existing local `file://` photos to Storage on first sign-in.
* Tombstone retention. A moi book is small, so keeping them indefinitely is
  fine for now; revisit if it ever isn't.
* Retiring `AppSettings` from device storage, or keeping `theme` local so the
  app renders in the right palette before the first network call.

## Verified

The DDL above was run against SQLite and exercised, not just written.

| Checked | Result |
|---|---|
| Whole schema parses — 9 tables, 5 views | ✅ |
| Four legal record shapes accepted (moi both ways, gift both ways) | ✅ |
| `app_settings` defaults land on a bare insert (`system` / `en` / 100 / 1) | ✅ |
| A second settings row for one user | ✅ refused — `user_id` is the primary key |
| Settings for a user who does not exist | ✅ refused |
| A theme of `'neon'`; a notify flag of `7`; a rounding of `0` | ✅ all refused |
| Deleting a user takes their settings with them | ✅ |
| A user with no settings row reads `theme` as `NULL`, **not** as the default | ⚠️ confirmed — this is why the row is created in the sign-up transaction |
| Moi with no amount / no payment type | ✅ refused |
| Moi received with no function; moi given attached to one of our functions | ✅ refused |
| Gift with a blank name; gift priced at `0` | ✅ refused |
| **A gift cannot be written into `moi`, and a payment type cannot be written onto a gift** | ✅ refused — the column does not exist, so it is not a rule that can be forgotten |
| A ₹64,000 gold chain leaves the function's collected total at 3002 | ✅ |
| An unpriced gift still counts as a gift, and is skipped in the value sum | ✅ |
| A person's moi history and gift timeline each read both directions in one query, no `UNION` | ✅ |
| Soft-deleted rows vanish from the views | ✅ |
| Deleting a function removes its moi, gifts and expenses — and leaves the `given` rows alone | ✅ |
| Deleting a person removes their moi, gifts and events | ✅ |
| A record naming a person who does not exist is refused | ✅ |
| Two accounts cannot claim one mobile number | ✅ |
