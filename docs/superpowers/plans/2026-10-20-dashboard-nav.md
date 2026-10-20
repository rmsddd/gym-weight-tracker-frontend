# Plan: dashboard and app-wide navigation

Design: `docs/superpowers/specs/2026-10-20-dashboard-nav-design.md` (approved 2026-10-20).
Mockup: `docs/superpowers/mockups/2026-10-20-dashboard-nav-final.html`.

No backend changes. The project has no frontend test runner, so each task is checked with
`npm run lint` and `npm run build`, and the whole thing in the browser at the end (phone width
390px and PC width 1280px). One commit per task, pushed straight to `main`.

Breakpoint everywhere: phone below 900px, PC from 900px.

## 1. Workout focus flag

`src/stores/workoutFocus.js`: a tiny reactive store (same style as `stores/auth.js`) with
`state.isFocused` and `setFocused(bool)`.

`ActiveWorkout.vue`: `watch(() => workout.value != null && !isFinished.value, setFocused, { immediate: true })`
and `setFocused(false)` in `onBeforeUnmount`. While the workout is loading the flag is false, so
navigation can flash briefly on a running workout; acceptable, or start the flag as true when the
route is `workout-active` if the flash is noticeable.

## 2. Start-workout action

`src/composables/useStartWorkout.js` exporting `startWorkout()`:
- `GET /workouts`, keep those with `started_at` set and `finished_at` null, pick the one with the
  latest `started_at`; if found, `router.push('/workouts/:id')`, else `router.push('/workouts/new')`.
- If the request fails, fall back to `/workouts/new`.
- Guard against double taps while the request is in flight (`isStarting` ref, returned too).

## 3. Navigation shell

`src/components/ui/AppNav.vue`, one component rendering both:
- **Tab bar** (below 900px): fixed to the bottom, `surface-low` background, top border `divider`,
  5 columns: Home `/dashboard`, Templates `/templates`, ＋ (round 56px magenta, raised -28px, calls
  `startWorkout`), History `/history`, Profile `/profile`. Labels 11px/700. Height 60px plus
  `env(safe-area-inset-bottom)`. Active entry in `--color-accent-blush`; `/records` highlights
  Profile; `/workouts/*` highlights nothing.
- **Rail** (900px and up): fixed left, 232px wide, as in the mockup: brand, Start workout button
  (calls `startWorkout`), Home, Templates, History, Records, and at the bottom avatar + first name +
  "Profile" linking to `/profile`.
- `<nav aria-label="Main">`, `aria-current="page"` on the active entry. Icons from `@mdi/js`
  (home-outline, clipboard-list-outline, plus, history, trophy-outline, account-outline).

`App.vue`: render `<AppNav>` when the route is logged-in (`!meta.guestOnly && !meta.public`) and
`workoutFocus.state.isFocused` is false. Wrap `<router-view>` in a div that gets class `with-nav`
when the nav shows. Under `.with-nav`:
- phone: override `--page-pad-bottom` to `calc(48px + 60px + env(safe-area-inset-bottom))`;
- PC: `padding-left: 232px`.
Pages already read `--page-pad-bottom`, so they make room without changes.

## 4. Remove the ☰ menu

- `PageLayout.vue`: drop `AppMenu` from the header.
- `Dashboard.vue`: drop `AppMenu` and the "+ New workout" button from the header (and the
  `max-width: 420px` rules that only existed for them).
- Delete `src/components/ui/AppMenu.vue`.

## 5. Profile → Records

`ProfilePage.vue`: a row/link "Personal records" (trophy icon, chevron) to `/records`, above the
Log out button. Log out stays where it is.

## 6. Templates page opens "New template" on request

`TemplatesPage.vue`: in `onMounted`, if `route.query.new` is set, call `openCreate()` and
`router.replace({ query: {} })` so a refresh or Back does not reopen it.

## 7. Dashboard: phone (Train / Progress)

Below 900px:
- **Train** heading (20px/800), then the existing "In progress" card(s).
- `src/components/ui/TemplateShelf.vue`: loads `GET /workout-templates`; horizontal scroll row of
  112px cards (name + "N exercises" from `template.exercises.length`) and a dashed "+ New" card
  linking to `/templates?new=1`. Tapping a template starts it like `startFrom` in
  `TemplatesPage.vue` (move that function into `useStartWorkout.js` as `startFromTemplate(template)`
  and use it in both places). Hidden entirely while a workout is running (`runningWorkouts.length`).
- **Progress** heading, then the stat cards and Recent workouts as today. The "Recent workouts"
  section title stays.

## 8. Dashboard: PC (calendar + stats)

From 900px: content max-width grows to ~1100px; two columns (`420px 1fr`, gap 32px). Left the
calendar, right the stat cards and Recent workouts. Train zone and TemplateShelf are not rendered.

`src/components/ui/MonthCalendar.vue`, prop `workouts` (the dashboard's list, running ones
excluded):
- State: shown month (starts at the current one). Heading: month name, plus year when not the
  current year; previous / next icon buttons (next disabled on the current month); "History ›"
  link to `/history`.
- Grid: Monday-first weekday row (M T W T F S S), then the days; leading/trailing blanks. Group
  workouts by their `date` (YYYY-MM-DD, local).
- Day square (radius 9px, `surface-hover` background, number bottom-right 12px). With workouts:
  `--color-accent` background, white number, top-left label 10.5px/600, white at 72% opacity,
  clamped to two lines: the workout name (or "Workout"), or "N workouts" when several. Today:
  1.5px blush outline (kept on a magenta day).
- Day with one workout: a `RouterLink` to `/workouts/:id`. Several: a button opening a `v-menu`
  under the day listing the names; each a link to its workout. Empty days are plain, not focusable.
  `aria-label` per active day, for example "October 18, Push day" or "October 18, 2 workouts".

## 9. Check in the browser

Needs the backend reachable (MySQL login in the backend `.env` currently fails; fix first).
At 390px and 1280px, check: nav on every logged-in page and none on login; ＋ / Start workout with
and without a running workout; nav hidden on a running workout and shown after Stop; Train row
hidden while running; "+ New" opens the dialog; calendar arrows, today, multi-workout menu, link
to a workout; Profile → Records; Log out.
