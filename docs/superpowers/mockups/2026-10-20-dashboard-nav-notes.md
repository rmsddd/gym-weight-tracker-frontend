# Dashboard and navigation redesign: where we left off (2026-10-20)

Brainstorming state, not an approved design. Nothing has been built yet.

Open `2026-10-20-dashboard-nav-final.html` in a browser for the chosen layout (PC on top, phone below).

## Decided by the user

- **New navigation across the whole app**: the ☰ menu (`AppMenu.vue`) goes away.
- **Phone**: bottom tab bar in the order **Home · Templates · ＋ · History · Profile** (＋ round, in the middle, starts a workout).
  - Dashboard has two zones: **Train** (the workout in progress with its live timer, then a row of templates plus "+ Empty") and **Progress** (the 3 current stat cards, then recent workouts with delete and chevron).
  - No "History ›" link next to Progress; History is reached from the tab bar.
- **PC**: left side rail, in the order Start workout (highlighted) · Home · Templates · History · Records, with avatar + Profile at the bottom.
  - Dashboard: the month calendar on the left, the 3 stat cards and "Recent workouts" on the right (the current component, unchanged).
  - No Train zone on PC (workouts start from the rail button).
  - Calendar days with a workout are magenta and show the workout's name, small, top-left, slightly faded; today is outlined.
  - The calendar carries no numbers of its own (the stat cards already show them).
- The "In progress" card stays as today: shown at the top only while a workout is running.
- Visual style unchanged: plum dark ground, magenta accent, Nunito.

## Claude's assumptions, not yet confirmed

- Personal records has no tab on the phone; it is reached from Profile (and has a rail entry on PC).
- Log out moves into Profile.
- The bar/rail hides during an active workout (`/workouts/:id`), per PRODUCT.md "nothing extra during a workout".
- ＋ goes to the workout in progress if one is running, instead of starting a second one.

## Still open

- What tapping a coloured calendar day does on PC (open that workout? History for that day?).
- What a day with two workouts shows in the calendar (first name, both, "2 workouts").
- Next steps: write the design doc in `docs/superpowers/specs/`, get it approved, then plan and build.

## Other files here

- `2026-10-20-dashboard-phone-sketch.html`: the phone sketch picked in the Impeccable decision round (before the later tab-order and History-link changes).
- `2026-10-20-dashboard-desktop-alternatives.html`: the three PC alternatives (A1 shelf, A2 calendar, A3 "Up next") that led to the calendar layout.
