# Dashboard and app-wide navigation redesign

Date: 2026-10-20. Visual reference: `docs/superpowers/mockups/2026-10-20-dashboard-nav-final.html`
(PC on top, phone below; sample data). Earlier rounds sit next to it and are background only.

Items marked **(Claude's call)** were decided by Claude, not by the user; everything else the user
chose or confirmed.

## Why

Navigation today hides behind a ☰ menu (`src/components/ui/AppMenu.vue`) in each page header. The
user wants every section reachable directly, in one tap, and a dashboard that shows at a glance
what they trained and lets them start training quickly.

## Goals

- Every main section is one tap away on every page, phone and PC.
- On the phone, starting a workout (empty or from a template) is the most reachable action.
- On PC, the month's training is visible at a glance in a calendar.

## Non-goals

- No new backend endpoints or data. Everything shown already comes from `GET /workouts` and
  `GET /workout-templates`.
- No change to the visual style: plum dark ground, magenta accent, Nunito, existing tokens in
  `src/assets/tokens.css`.
- No change to the workout screen itself (`ActiveWorkout.vue`), History, Templates or Records pages
  beyond swapping their navigation, plus a way to open the Templates page with its "New template"
  dialog already open.

## Anti-goals

- Anything that adds chrome or distraction during a running workout (PRODUCT.md principle 4).
- Two workouts running at once because of a stray tap on ＋.

## Navigation

The ☰ menu (`AppMenu.vue`) is removed everywhere. Navigation lives in one shared shell that wraps
the logged-in pages (Dashboard, Templates, History, Records, Profile, the new-workout form, and a
finished workout's page).

**Breakpoint (Claude's call):** phone layout below 900px, PC layout from 900px up (the dashboard
already uses 900px as its desktop breakpoint).

### Phone: bottom tab bar

Order: **Home · Templates · ＋ · History · Profile**.

- ＋ is round, magenta, raised in the middle (see mockup).
- ＋ goes to the workout in progress if one is running; otherwise to `/workouts/new`. If several
  are running (older data allows it), it opens the most recently started one **(Claude's call)**.
- "Running" means started and not finished (`finished_at` is null), as on the dashboard today.
- Personal records has no tab; Profile gets a link to `/records`.
- The active tab is highlighted (blush colour, as in the mockup). Records counts as Profile for
  highlighting **(Claude's call)**.
- The bar respects the iPhone home indicator (safe-area inset), and page content gets bottom
  padding so nothing hides behind it **(Claude's call)**.

### PC: left rail

Order, top to bottom: brand "Gym Weight Tracker" · **Start workout** (magenta button) · Home ·
Templates · History · Records · and pinned at the bottom the avatar, first name and "Profile",
linking to `/profile`.

- Start workout behaves exactly like ＋ on the phone.
- The active entry is highlighted as in the mockup.

### Hidden during a running workout

On `/workouts/:id` the bar and the rail are hidden while that workout is running (started and not
finished). On a finished workout's page they show as on any other page. When the user stops the
workout on that page, navigation appears; when they start it again, it hides **(Claude's call:
it follows the workout's state live)**.

### Log out

Already on the Profile page (`ProfilePage.vue`); with the ☰ menu gone, that is its only place.

## Dashboard

The "In progress" card stays as it is today: at the top, only while a workout is running, with its
live timer, linking to the workout.

The greeting ("Hi, <first name>" with avatar) stays. The "+ New workout" button and the ☰ menu
leave the header; ＋ and Start workout replace them.

### Phone: two zones

**Train**
1. The "In progress" card, when there is one.
2. A horizontal row of the user's templates, each a small card with the name and "N exercises",
   ending with a dashed "+ New" card (the mockup's "+ Empty"; label is **Claude's call**).
   - Tapping a template starts today's workout from it and opens it, exactly like "Start" on the
     Templates page (`startFrom` in `TemplatesPage.vue`) **(Claude's call)**.
   - Tapping "+ New" creates a new template, it does not start a workout: it opens the Templates
     page with its existing "New template" dialog already open. After saving, the user stays on the
     Templates page **(Claude's call)**.
   - The row scrolls sideways when there are more templates than fit. With no templates, only
     "+ New" shows.
   **While a workout is running, the whole row (templates and "+ New") is hidden**; Train shows
   only the "In progress" card. This is the dashboard's only guard: the Templates page and the
   new-workout form keep working as today.

**Progress**
1. The three current stat cards (Workouts 30 days, Last workout, Average duration), unchanged.
2. Recent workouts, unchanged (delete button and chevron, empty states included).
3. No "History ›" link next to the Progress title.

### PC: calendar and stats

No Train zone on PC (workouts start from the rail button). Two columns:

- **Left: a month calendar,** opening on the current month. Heading with the month name and a "History ›" link to
  `/history` (as in the mockup). Weeks start on Monday. Each day is a square with its number in the
  bottom-right corner. The calendar shows no totals of its own.
  - A day with one finished workout is magenta and shows the workout's name, small, top-left,
    slightly faded, cut to two lines.
  - A day with two shows both names, one per line, each cut with an ellipsis when long. With
    three or more, the second line reads "+N more" (changed 2026-10-20 from "2 workouts").
  - Today is outlined in blush. Today with a workout is magenta and keeps the outline
    **(Claude's call)**.
  - Days outside the month are blank.
  - A running workout does not colour its day until it is finished **(Claude's call: the card
    above already shows it)**.
- **Right:** the three stat cards and "Recent workouts", the same component as on the phone.

**Tapping a coloured day:** with one workout, it opens that workout's page (`/workouts/:id`, which
shows the exercises with reps and weights). With several, a small list opens under the day with
their names; choosing one opens it. Empty days do nothing.

**Month arrows:** previous/next arrows beside the month name let the user page through past
months. It opens on the current month. Details below are **Claude's call**:
- The next arrow is disabled on the current month (no future months).
- The previous arrow has no limit; months without workouts simply show an empty grid.
- The heading adds the year when the month is not in the current year ("March 2025").
- The month shown is not remembered: reopening the dashboard shows the current month again.
- The dashboard already loads all of the user's workouts (`GET /workouts`), so changing months
  needs no new request.

## What is left to the builder

- How the shell is built (a layout component wrapping routes, `App.vue` changes, route meta, etc.)
  and how Dashboard and `PageLayout.vue` adapt to it.
- Component split for the calendar, template row and day-picker list.
- Icons: pick close matches from `@mdi/js` for those in the mockup.
- Exact sizes and spacing, following the mockup and existing tokens.
- Accessibility basics: nav landmarks, `aria-current` on the active entry, keyboard-focusable
  calendar days with a label like "Oct 18, Push day".
