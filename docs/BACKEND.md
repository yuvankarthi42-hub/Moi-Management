# Running the backend

The schema and the reasoning behind it are in [DATABASE.md](DATABASE.md).
This is how to run what was built against it.

## Setup

```bash
cp .env.example .env.local   # then fill in the values
npm install
node db/apply-schema.mjs     # creates the 9 tables, 5 views and 22 indexes
npx expo start --web
```

`db/apply-schema.mjs` is safe to re-run: it creates what is missing and reports
what already exists. It is a setup tool, not a migration framework — there are
no migration scripts, as asked.

## The two data modes

`EXPO_PUBLIC_DATA_MODE` decides where SQL runs.

| | `direct` | `api` |
|---|---|---|
| Who holds the Turso token | the app | the server |
| Safe to ship | **no** | yes |
| Needs a server | no | yes |

`direct` is for local verification only, and the reason is not theoretical.
The production bundle was searched after building it:

```
production bundle: 3.1M
  moi-manager-karthickcinraj  1
  the read-write Turso token  1   ← in a file any user can download
```

Anyone who opens the site can read that token out of the JavaScript and then
reach **every row in the database**, for every user — which is exactly the
isolation the schema exists to provide. So before this goes anywhere public:

1. Stand up an API (Cloudflare Workers sits closest to Turso and is cheapest).
   It needs two routes, `POST /query` and `POST /transaction`, matching
   `ApiSqlClient` in `src/data/turso/SqlClient.ts`.
2. It verifies the `Authorization: Bearer <firebase id token>` header and takes
   the user id **from the token's claims** — never from the request body.
3. Set `EXPO_PUBLIC_DATA_MODE=api` and `EXPO_PUBLIC_API_URL`, and delete
   `EXPO_PUBLIC_TURSO_TOKEN_DEV_ONLY` from the app's environment.
4. Rotate the Turso token, since the current one has been in a client bundle.

Nothing in the app changes: both clients satisfy the same `SqlClient`
interface, and `TursoDataSource` never knows which one it has.

## Sign-in

Google only, through Firebase.

```
Google sign-in  →  users row created  →  phone? ──no──→ /auth/phone
                                          └──yes──────→ /(tabs)
```

`users.phone IS NULL` is the entire "first time" test — no second flag to
disagree with it.

**Web works now.** iOS and Android need a native OAuth client id per platform,
exchanged through `expo-auth-session` for a Google ID token. Until those are
configured, `signInWithGoogle` on native raises a message saying exactly that
rather than failing somewhere deeper.

## The COOP warning during sign-in — and why it stays

Sign-in uses a popup (`signInWithPopup`), which logs this on every attempt:

```
Cross-Origin-Opener-Policy policy would block the window.close call
```

Google's own sign-in page sends `Cross-Origin-Opener-Policy: same-origin`,
which severs the popup's link back to the page that opened it — so Firebase
cannot close the popup window itself once sign-in succeeds. No header on our
side changes this; the policy is set by the page the popup navigated to, once
it left our origin.

**It is cosmetic.** Confirmed by checking the database immediately after a
popup sign-in that logged the warning: the `users` row was created and its
timestamps updated exactly when expected, every time.

A full-page redirect (`signInWithRedirect`) was tried instead, specifically to
remove the warning. It made things worse: its return leg depends on a hidden
iframe at `${authDomain}/__/auth/iframe` relaying the result back across
origins, and that is exactly the kind of cross-site storage access browsers
increasingly restrict — `localhost` is a common place for it to fail
silently, with no error to show and no account ever set. Popup is the flow
this app has direct evidence of completing; it stays, warning and all.

## Offline

Read-only, as specified. The last snapshot fetched from the database is shown
and every write is refused.

- Only fetched data is cached. A write goes to the database, the snapshot is
  re-fetched, and it is that fetch which is stored — so the cache can never
  hold a record the database does not have.
- The cache is keyed by user id, so one account never sees another's books, and
  it is cleared on sign-out.
- `canWrite()` in `src/store/AppDataProvider.tsx` is the single gate. Screens
  also disable their own controls, but the gate is what makes read-only true
  rather than merely encouraged: a screen that forgets still cannot write.

## Isolation

libSQL has no row-level security, so the filter has to be in every statement.
Two tests hold that in place:

- `src/data/turso/__tests__/isolation.test.ts` parses `TursoDataSource.ts` and
  fails the build if any statement reaches a user table without `user_id`, if a
  child insert is not written as `INSERT ... SELECT` against its parent, or if a
  list forgets `deleted_at IS NULL`.
- `db/live/isolation.live.test.ts` proves it against the real database: two
  users, one writes, the other tries every way in. Run it on demand, since it
  needs credentials and a network:

  ```bash
  npx jest --testMatch '**/db/live/*.live.test.ts'
  ```

## What is not done

- **Photos** are still local `file://` URIs. The schema stores a Storage path
  and `docs/DATABASE.md` has the layout, but nothing uploads yet.
- **Their functions** (`person_events`) still has no screen that creates one,
  so the Return Moi report and reminder cannot fire for a real account. The
  table, the calculation and its tests are all in place; the form is missing.
- **Function sharing** is designed and the table exists, dormant. The More
  screen says "Soon".
