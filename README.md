# Moi Manager

A mobile-first app for recording **moi** (மொய்) — the cash gifts exchanged at Tamil
family functions — and for knowing what you owe back when a guest hosts their own.

Built with **Expo SDK 54 / React Native 0.81 / expo-router / TypeScript**.

> **Data:** the app currently runs on realistic **mock data** behind a proper
> persistence port. Nothing about the screens assumes it — see
> [Swapping in a real backend](#swapping-in-a-real-backend).

---

## Running it

```bash
nvm use            # Node 20 (Expo 54 will not run on Node 18)
npm install
npm start          # then press i / a, or scan the QR with Expo Go
```

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run ios` / `npm run android` | Open in a simulator/emulator |
| `npm run web` | Run in the browser |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest unit tests |

The project resolves packages from public npm via `.npmrc`; Expo's dependency
tree is not fully mirrored on the internal registry, while `@zoho*` scopes still
point at the mirror.

---

## Architecture

The app is layered so that the UI never knows where data comes from.

```
app/                      Routes (expo-router). Screens only — no data access.
│
src/
├── components/
│   ├── ui/               Design-system primitives (Screen, Button, Field, …)
│   └── app/              Domain components (FunctionCard, PersonPicker, …)
│
├── store/                React context: loads a Dataset, exposes mutations
│        │
│        ▼
├── data/                 ← the "backend"
│   ├── index.ts          Composition root: picks the DataSource
│   ├── DataSource.ts     The persistence PORT (one interface)
│   ├── repositories/     Business rules & validation, one per aggregate
│   └── mock/             In-memory + AsyncStorage ADAPTER, and the seed data
│
├── domain/
│   ├── models.ts         Types. Money is always whole rupees, never a float.
│   ├── selectors.ts      Every derived view & report, as pure functions
│   ├── functionTypes.ts  Function-type metadata (label, emoji, tint)
│   └── categories.ts     Expense categories, RSVP states, roles & permissions
│
├── services/             PDF (expo-print), CSV, and backup/restore
├── theme/                Palettes (light + dark), spacing, elevation, type ramp
└── utils/                Indian-numbering money format, date helpers
```

**The rule that keeps it honest:** a screen may import from `store`, `domain`
and `components`. It may never import from `data/mock`.

### Why the dataset is loaded whole

`AppDataProvider` reads every collection into memory at startup and reloads
after each mutation. At this scale (a heavy user has a few thousand moi entries)
that costs nothing, and it means the home totals, the person's history and all
six reports are guaranteed to agree after any edit — with no cache invalidation
to get wrong. Every report is then a pure function of that snapshot, which makes
them trivial to test.

### Swapping in a real backend

`src/data/index.ts` is the only file that names a data source:

```ts
function createDataSource(): DataSource {
  return new MockDataSource();          // ← replace this one line
  // return new SqliteDataSource();
  // return new ApiDataSource(baseUrl, token);
}
```

Implement the ~30 methods of `DataSource` and nothing else changes — not the
repositories, not the selectors, not a single screen. Every method is already
`async`, so call sites are written for real latency today.

---

## Features

**Functions** — create, edit, delete; type, date, time, venue, village, guest
count, expenses, notes, cover photo and a photo gallery. Filter by
All / Upcoming / Completed; search by name, venue or village.

**Moi entries** — person, amount, payment type (Cash / UPI / Other), notes and an
optional photo. Quick-amount chips, the person's previous amount shown inline,
and a duplicate-entry warning when someone is recorded twice at one function.

**People** — contact book with phone, village, relation and family. Sort by name,
amount or recency; filter by village. Each profile shows lifetime total, moi
history, their upcoming functions, and call / message shortcuts.

**Guests** — a per-function guest list where one row is an invitation covering a
household, with RSVP (accepted / pending / maybe / declined), head-count and
check-in. The same `Person` is reused across functions rather than duplicated.

**Expenses** — recorded against a function, with category, payment type, who
paid, date, notes and a receipt photo. There is deliberately **no budget
module**: expenses are secondary to moi and never exist outside a function.

**Reports** — all ten: Function, Person, Village, Family, Return Moi, Top
Contributors, Moi Collection, Expense, Payment Method and Guest — each with a
period filter and **PDF / Excel (CSV) export** via the native share sheet.

**Search** — one box across functions, people, moi entries and guests, with
results grouped by kind.

**Return Moi** — the distinctive one. It lists guests whose own function is
coming up, how much they last gave, and a suggested amount to return; mark one
as returned when you have given it. The suggestion rounds up to a configurable
multiple and can add the traditional auspicious ₹1 (₹1000 → ₹1001).

**Family collaboration** — members with Owner / Admin / Editor / Viewer roles.
Permissions are enforced in `FamilyMemberRepository`, not in the UI, so a screen
cannot bypass one by rendering a button.

**Settings** — profile, families, suggestion rules, reminder preferences,
theme and language, and versioned JSON backup / restore through the share sheet
(a restore always confirms first — it replaces every record).

**Dark mode** — a full second palette. `makeStyles` builds one stylesheet per
palette up front and hands back the active one, because `StyleSheet.create`
captures colour *values* and a module-scope sheet can otherwise never react to a
theme change.

> Per the brief, the **Invitation** and **QR Check-in** modules are deliberately
> not implemented. The data model leaves room for both: `Guest` already carries
> `rsvpStatus` and `checkedIn`, so QR check-in only needs a scanner screen that
> calls `GuestRepository.setCheckedIn`.

---

## Mobile-first layout

Safe areas are handled explicitly rather than with a blanket `SafeAreaView`, so
the app behaves on notched iPhones, Android gesture navigation and older devices
alike:

- **Top** — `AppHeader` draws its gradient from `y=0` and pushes its *content*
  down by `insets.top`, so colour fills the status bar instead of leaving a white
  band. `StatusBar` is `light` everywhere, because every header is deep purple.
- **Bottom** — the tab bar is `TAB_BAR_HEIGHT + insets.bottom` tall with the
  inset applied as padding: touch targets clear the home indicator while the
  background still reaches the screen edge. Scroll views add that same allowance
  (`ScreenScroll`, `useListBottomPadding`) so nothing hides behind the bar.
- **Docked actions** — `DockedFooter` pads by `max(insets.bottom, 12)`, so "Save
  Entry" sits above the home indicator and above the gesture bar.
- **Keyboard** — `KeyboardForm` uses `padding` behaviour on iOS only; Android's
  `adjustResize` already handles it and doubling up would shift content twice.
- **Android edge-to-edge** is enabled (`app.json`), which is why insets are read
  on both platforms rather than iOS alone.

Type scales with the device's font-size setting; stat figures use
`adjustsFontSizeToFit` so large accessibility text shrinks rather than truncates.

---

## Notes on the demo data

`src/data/mock/seed.ts` generates ~48 people, 8 functions and several hundred moi
entries from a fixed PRNG seed, with dates computed **relative to today** so there
is always a genuinely upcoming function and a live return-moi list.

Amounts are drawn from real moi denominations, which traditionally end in ₹1.
Function totals are therefore whatever the entries actually add up to — they are
computed, never hard-coded, so they will not match the round headline figures in
the original mockups.


---

## Deploying the web build to Vercel

> **This deploys the web build only.** Moi Manager is a React Native app — the
> iOS and Android apps ship through EAS Build and the stores, not Vercel. The
> web build is for demos, review and sharing a link; treat it as a preview of
> the product, not the product itself.

Config lives in [`vercel.json`](vercel.json):

| Setting | Value |
| --- | --- |
| Build command | `npx expo export --platform web` |
| Output directory | `dist` |
| Node | 20.19.4+ (`engines` in package.json) |

**Git integration (recommended)** — push the repo, then in the Vercel dashboard
*Add New → Project → Import*. `vercel.json` supplies the build settings, so
accept the defaults and deploy. Every later push redeploys.

**Or from this machine:**

```bash
npx vercel --prod
```

The first run asks you to log in and links the project.

### Why `output: "single"` and not `"static"`

`app.json` sets the web build to a single-page app. A static export pre-renders
one HTML file per known route, but `/function/[id]` and `/person/[id]` depend on
ids that only exist in the visitor's own browser storage — they can never be
enumerated at build time. The SPA shell plus the rewrite in `vercel.json` lets
the client router resolve those routes on a hard refresh. (Verified: a cold load
of `/function/fn_3` works.)

### What behaves differently on the web build

- **Dates** use the browser's native `<input type="date">`
  ([`DateField.web.tsx`](src/components/app/DateField.web.tsx)).
  `@react-native-community/datetimepicker` ships no web build, so on a browser
  the picker rendered nothing and a date could not be chosen at all.
- **Haptics** are a no-op; there is no vibration API in play.
- **PDF / CSV export and backup** download through the browser instead of the
  native share sheet.
- **Storage is per-origin `localStorage`.** Each visitor to the deployed URL
  gets their own copy of the demo data; nothing is shared or uploaded, and
  clearing site data resets it.

---

## Tests

```bash
npm test
```

46 unit tests over the parts where a mistake would be silent and expensive:

- **Selectors** — that every total is summed from transaction rows, that a
  planned function falls back to the host's guest estimate, that reports respect
  their date range, and that the return-moi suggestion rounds correctly.
- **Formatting** — lakh/crore grouping, the negative-sign position (`-₹2,05,512`,
  not `₹-2,05,512`), and that `toISODate` uses local time so a late-evening entry
  does not roll into the next day.
- **Repositories** — required fields, duplicate-phone and duplicate-guest
  detection, and that deleting a function takes its moi, expenses and guests with
  it while deleting a person leaves their guest rows intact.

Two real bugs surfaced this way and are fixed: "last received" in the return-moi
report picked an arbitrary row when someone gave twice at one function (it now
sums the occasion), and repository validation threw *synchronously* from methods
typed `Promise<T>`, so `.catch()` would not have caught it.

---

## Known gaps

- **Stage 2 (Drift/SQLite)** is not built. The port and repositories are shaped
  for it — see [Swapping in a real backend](#swapping-in-a-real-backend) — but
  the only adapter today is the AsyncStorage-backed mock.
- **Tamil strings** are not extracted for localisation. The language preference
  is stored and the layouts are built to take longer Tamil labels, but the UI
  copy is still English.
- **Notification scheduling** is not wired. The preferences exist; nothing
  registers them with the OS yet.
- The dataset is loaded into memory whole. That is deliberate at this scale and
  documented above, but it is the thing to revisit first if a household ever
  accumulates tens of thousands of moi entries.
