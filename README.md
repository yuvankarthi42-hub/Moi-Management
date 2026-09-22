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
│   ├── repositories/     Business rules & validation
│   └── mock/             In-memory + AsyncStorage ADAPTER, and the seed data
│
├── domain/
│   ├── models.ts         Types. Money is always whole rupees, never a float.
│   ├── selectors.ts      Every derived view & report, as pure functions
│   └── functionTypes.ts  Function-type metadata (label, emoji, tint)
│
├── services/             Export to PDF (expo-print) and CSV
├── theme/                Colour, spacing, radius, elevation, type ramp
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

**Reports** — Function, Person, Village, Family, Return Moi and Top Contributors,
each with a period filter and **PDF / Excel (CSV) export** via the native share
sheet.

**Return Moi** — the distinctive one. It lists guests whose own function is
coming up, how much they last gave, and a suggested amount to return; mark one
as returned when you have given it. The suggestion rounds up to a configurable
multiple and can add the traditional auspicious ₹1 (₹1000 → ₹1001).

**Settings** — profile, families, suggestion rules, theme and language
preferences, JSON backup via the share sheet, and reset-to-demo-data.

> Per the brief, the **Invitation** and **QR Check-in** modules are deliberately
> not implemented. The data model leaves room for them: `FunctionEvent.guestCount`
> is kept separate from the moi entry count precisely so an invite list can land
> there later without a migration.

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
