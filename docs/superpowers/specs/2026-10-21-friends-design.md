# Friends: usernames, friend requests, live workouts

Date: 2026-10-21. Spans both repos: `gym-weight-tracker-backend` (Laravel 12, Sanctum, MySQL) and
`gym-weight-tracker-frontend` (Vue 3, Vuetify 4, vue-router, axios).

Items marked **(Claude's call)** were decided by Claude, not by the user; everything else the user
chose or confirmed.

## Why

The user wants to see when friends are at the gym, and when they are, look over their shoulder:
which workout they are doing, how long they have been there, the exercises and the weights. Today
the app is single-player; nobody can find or see anyone else.

## Goals

- Every account has a unique, permanent **username** (e.g. `@remus`), and people find each other by it.
- Friendship is **mutual**: you send a request, the other person accepts, and only then can each of
  you see the other's workouts.
- A **Friends** section lists your friends, each marked **online** or **offline**.
  Online = they have a workout running right now.
- An **Add friends** button opens a search across all users by username, from which you send requests.
- Tapping a friend opens their page: the **running workout** on top (if any: name, time elapsed,
  exercises, sets with weights/reps), and their **workout history** below.
- The friend's page and the Friends list **refresh on their own** (polling), so a live workout
  updates without reloading.

## Non-goals

- No WebSockets, Laravel Reverb or Pusher. The user chose polling; the app runs as one Apache
  container on Render and a second always-on process would cost money for little gain.
- No new npm or composer dependencies.
- Friends cannot see your stats, personal records, muscle stats, templates or profile page beyond
  what is listed here **(Claude's call)**.
- No chat, likes, comments, notifications by email/push, or activity feed.
- No changing the username after it is chosen. Not even through support tooling in the app.
- No blocking users **(Claude's call)**; declining or removing is enough for now.

## Anti-goals (would be a failure even if it works)

- A friend's or stranger's **email** leaking through search or friend endpoints. Search results and
  friend payloads expose only `id`, `username`, `name`, `avatar`.
- Seeing a non-friend's workouts by guessing an id.
- A friend's workout **notes** reaching friends **(Claude's call)**: friend endpoints use their own
  resource without `note`, not `WorkoutResource` as is.
- Being able to edit or delete a friend's workout through their page.

## Usernames

- Chosen by the user. Rules **(Claude's call)**: 3–20 characters, lowercase letters, digits, `.` and
  `_`; stored lowercase, unique case-insensitively (input `Remus` is saved as `remus`). Shown with an
  `@` prefix in the UI, stored without it.
- **New accounts** pick it on the register form. Registration goes through `PendingRegistration`
  (`RegistrationService::start` / `confirm`), so the username is stored on the pending row and copied
  to the user on confirm. Validation must reject usernames already taken by a `User`. If two pending
  sign-ups pick the same username, the second one to confirm still gets their account, with
  `username = null`, and picks one on the "Choose your username" page at first login, the same path
  existing users take **(Claude's call)**.
- **Existing accounts** have no username. The `users.username` column is nullable at first. After
  login, a user with `username = null` is sent to a "Choose your username" page and cannot reach any
  other authenticated page until they pick one (router guard in `src/router/index.js`, next to the
  existing `requiresAuth` checks; the backend also refuses the social endpoints for users without a
  username) **(Claude's call)**.
- Once set it **cannot be changed**: the endpoint that sets it only works while it is `null`.
- **Profile**: the user can edit their **display name** (`name`) there, but not the username, which is
  shown read-only. There is no name editing in `ProfilePage.vue` today; this adds it.

## Friendships

Table `friendships` **(Claude's call on the shape)**: `id`, `requester_id`, `addressee_id`,
`status` (`pending` | `accepted`), timestamps; unique on the pair regardless of direction (enforce in
the service: a request from B to A while A→B is pending accepts it instead of creating a second row).

- Send request: by user id, from search results. Not to yourself, not to an existing friend, not twice.
- The addressee can **accept** or **decline**. Declining deletes the row **(Claude's call)**, so the
  requester can try again later and is not told it was declined; the requester just sees it as pending
  until then.
- The requester can **cancel** a pending request.
- Either friend can **remove** the friendship (deletes the row) **(Claude's call)**.
- Pending incoming requests show a count badge on the Friends entry in the nav **(Claude's call)**.

## Online status

- A user is **online** when they have a workout with `started_at` set and `finished_at = null`, i.e.
  they have not pressed Finish. **No time cutoff**: the user explicitly chose this over an earlier
  3-hour cutoff, accepting that someone who forgets to stop shows online until they do.
- A stopped workout (`finished_at` set, `completed_at` null, can still be resumed) counts as
  **offline**; resuming it makes them online again.
- **Time elapsed** shown to friends counts from the last start or resume, not the original
  `started_at`, so a workout resumed the next day doesn't read "24 h" **(Claude's call)**. This needs
  a new nullable `workouts.resumed_at` column, set by `WorkoutService::resume`; elapsed =
  now − (`resumed_at` ?? `started_at`). The owner's own timer is unchanged.
- If more than one workout qualifies, the most recently started or resumed one is shown **(Claude's call)**.

## Screens

Follow the existing visual style (tokens in `src/assets/tokens.css`, Nunito, `PageLayout`,
`Avatar`). The user prefers mockups made with the impeccable skill and shown in Chrome before
building UI; the builder should show one for the Friends page and the friend's page.

- **Friends page** (`/friends`): list of friends with avatar, name, `@username`, and an
  online/offline marker. Online friends also show the running workout's name and time elapsed, and
  sort first **(Claude's call)**. Above the list: incoming requests (accept/decline) and outgoing
  requests (cancel). An **Add friends** button opens search.
- **Add friends**: a search field; partial, case-insensitive match on username, prefix-first
  **(Claude's call)**, starting at 2 characters, debounced, max 20 results **(Claude's call)**. Each
  result shows avatar, name, `@username` and its state: Add / Request sent / Accept / Friends. It
  searches all users, excluding yourself.
- **Friend's page** (`/friends/:username` **(Claude's call)**): header with avatar, name,
  `@username`, online/offline. If online: the live workout (name, time elapsed ticking locally every
  second like `Dashboard.vue` does, exercises in their order, each set with weight/reps/duration as the
  owner's screen shows them). Below: their history, laid out like `HistoryPage.vue` but read-only,
  with no edit, delete, resume or "save as template" actions. A **Remove friend** action, behind
  `ConfirmDialog`.
- **Choose your username** page for existing users (see above), and a username field on the register form.
- **Navigation**: Friends goes in the PC rail in `src/components/ui/AppNav.vue`. The phone tab bar is
  full (Home · Templates · ＋ · History · Profile), so on the phone Friends is reached from the Profile
  page, the same way Records is, and Profile stays lit while on `/friends` **(Claude's call)**.

## Refresh (polling)

- Friends page: re-fetch the friend list and requests every **15 s** while the page is open.
- Friend's page: re-fetch every **5 s** while the friend is online, every **30 s** while offline
  **(Claude's call on 30 s)**.
- Stop polling when the page is left or the browser tab is hidden (`document.visibilityState`), and
  re-fetch at once when it becomes visible again **(Claude's call)**.
- Mind the existing `throttle:api` limiter: polling at these rates must stay well inside it; adjust the
  limit if needed.

## Backend sketch (the builder may reshape this)

- Migration: `users.username` (nullable, unique). Migration: `pending_registrations.username`.
  Migration: `friendships`.
- Endpoints under the existing `auth:sanctum` + `throttle:api` group, e.g.:
  - `PATCH /user/username`: set once.
  - `PATCH /user/name`: change display name.
  - `GET /users/search?q=`: search by username.
  - `GET /friends`: friends with online status and, when online, the live workout's id, name and `started_at`.
  - `GET /friend-requests`: incoming and outgoing.
  - `POST /friend-requests`, `POST /friend-requests/{id}/accept`, `DELETE /friend-requests/{id}`
    (decline or cancel), `DELETE /friends/{user}`.
  - `GET /friends/{user}/workouts` and `GET /friends/{user}/workouts/{workout}`: read-only, with a
    friend-facing workout resource (like `WorkoutResource` minus `note`) and the eager loading used
    by `WorkoutController@index` (`include=exercises`).
- Migration: `workouts.resumed_at` (see Online status).
- Authorization in policies (`UserPolicy`, `WorkoutPolicy` already exist): viewing another user's
  workouts requires an accepted friendship. The existing own-workout endpoints must stay owner-only.
- A small public user resource (`id`, `username`, `name`, `avatar`) for every social payload. Never
  return the raw `User` model there (the existing `GET /user` returns it with email, which is fine for
  yourself only).
- Feature tests next to the existing ones in `tests/Feature/`: username rules and immutability,
  request lifecycle, non-friends get 403 on workouts, email and `note` never present in social
  payloads, online/offline across start, stop and resume, elapsed time after a resume, and the existing `RouteProtectionTest` extended to the new routes.

## Left to the builder

Component split, store shape, exact copy text, empty states, loading skeletons (`SkeletonList`
exists), and error messages, in the style of the existing pages.
