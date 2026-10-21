# Roles and permissions (spatie/laravel-permission) with a root admin page

Date: 2026-10-21. Spans both repos: `gym-weight-tracker-backend` (Laravel 12, Sanctum, MySQL) and
`gym-weight-tracker-frontend` (Vue 3, Vuetify 4, vue-router, axios).

Items marked **(Claude's call)** were decided by Claude, not by the user; everything else the user
chose or confirmed.

## Why

The user wants to learn and try out `spatie/laravel-permission` in their own app: from a page only
they can open ("root"), they want to control what people are allowed to do, action by action, across
every controller. It starts as an experiment, but it is built properly (tests, migrations), not as a
throwaway.

## Goals

- Every API action a logged-in user can take is guarded by a **permission** (view, create, edit,
  delete and the special actions such as finish/resume/complete a workout, send a friend request…).
- Permissions are grouped into **roles**. Every user has **exactly one role**.
- **`sportiv`** is the default role: every new account gets it on sign up, every existing account
  gets it through a migration. It starts with **all** permissions ticked.
- **Root is a Super-Admin role named `root`** that only the user's own account has. Root passes every
  permission check and is the only one who can open the admin page and the admin API.
- From the **root page** the user can:
  - create, rename and delete roles;
  - tick/untick the permissions of a role; a change applies at once to everyone with that role;
  - list/search users and move a user to another role.
- When a permission is taken away, the API refuses the action (403) and the frontend hides the
  button/link/page for it.

## Non-goals

- **No creating permissions from the UI.** A permission only means something if code checks it, so
  the list of permissions lives in code; the page only shows it to tick. The user confirmed this.
- No per-user permissions (no direct permissions on users): a user's rights come only from their
  role. To restrict one person, root makes a new role and moves them into it.
- No multiple roles per user.
- No assigning `root` from the UI, and no second root. `root` is not in the role list.
- No audit log / history of who changed what **(Claude's call)**.
- No guarding the public/session endpoints: register, login, refresh, logout, forgot/reset password,
  email verification, `GET /user` **(Claude's call)**: taking these away would only lock people out.
- No permission on choosing a username (`PATCH /user/username`) **(Claude's call)**: friends and the
  username-gated routes depend on it, and an account without one is forced onto that page; denying it
  would trap the user there.

## Anti-goals (would be a failure even if it works)

- Root locking themselves out: root must keep full access whatever the roles say.
- Permissions replacing the ownership checks. A user with `workouts.delete` can still delete only
  **their own** workouts. Permissions are an extra gate on top of the existing policy rules, never
  instead of them. This includes root: root bypasses permissions, **not** ownership (root cannot
  edit other people's workouts through the normal endpoints).
- Existing users or tests breaking on deploy because they have no role yet.
- A permission that exists in the list but is checked nowhere (or an action that is checked by
  nothing). Every permission must map to real endpoints, and every guarded endpoint to a permission.

## Constraints

- One new composer dependency: `spatie/laravel-permission` (latest release supporting Laravel 12).
  No new npm dependencies.
- Auth is Sanctum (SPA cookie session, `auth:sanctum`); the default guard is `web`. Roles and
  permissions use the `web` guard **(Claude's call)**, so `$user->can()` works for Sanctum requests.
- Every controller already calls `$this->authorize(...)` against a Policy per model (Workout,
  WorkoutExercise, WorkoutSet, Exercise, Category, WorkoutTemplate, Friendship, User). Build on those.
- Commit straight to `main` in both repos, no feature branches, no Claude attribution trailers.
  No local test helpers / demo seeders committed (the user's standing rules).

## How it works

### Root

- Root is Spatie's documented **Super-Admin** pattern, with the role named **`root`** (the user chose
  this over an `is_root` column). Only the user's own account has it.
- The `root` role is created by the sync but has **no permissions attached**: it passes through a
  `Gate::before` that returns `true` for `hasRole('root')` **only for permission abilities** (names in
  the permission catalog), and `null` otherwise, so policy abilities like `update`/`delete` still run
  their ownership checks **(Claude's call)**.
- Exactly one role per user still holds: the root account has `root` instead of `sportiv`.
- The role is assigned only from tinker: `User::where('email', '...')->first()->syncRoles('root');`
- Protections so root can't be lost or handed out from the app:
  - `root` is not listed, editable, renamable or deletable through the admin API/page;
  - no user can be moved **into** `root`, and a user who has `root` cannot be moved out of it
    through the API (the root account is not offered a role picker on the page);
  - creating or renaming a role to `root` is rejected.
- Admin routes are behind a middleware that answers 403 to anyone without the `root` role.

### Permission catalog (in code)

One class (or config file) is the single source of truth: permission names grouped by area, each
with a human label for the UI. Names follow `<area>.<action>`. The initial catalog, mapped to the
current routes:

| Area | Permission | Guards |
|------|------------|--------|
| Workouts | `workouts.view` | list, show, previous sets |
| | `workouts.create` | start a workout |
| | `workouts.update` | edit a workout, reorder its exercises |
| | `workouts.finish` / `workouts.resume` / `workouts.complete` | the three state actions |
| | `workouts.delete` | delete |
| Workout exercises | `workout-exercises.view` / `.create` / `.update` / `.delete` | nested resource |
| Sets | `workout-sets.view` / `.create` / `.update` / `.delete` | nested resource |
| Exercises | `exercises.view` | catalog + custom exercises |
| | `exercises.create` / `.update` / `.delete` | the user's own custom exercises only |
| Categories | `categories.view` | |
| Templates | `templates.view` / `.create` / `.delete` | `create` also covers "save workout as template" |
| Stats | `stats.view` | personal records, muscle stats, profile stats, monthly stats |
| Friends | `friends.search` | search users |
| | `friends.view` | friends list, a friend's page and live workout |
| | `friends.requests` | see incoming/outgoing requests |
| | `friends.send-request` / `friends.accept-request` | |
| | `friends.remove` | unfriend, cancel/decline a request |
| Profile | `profile.update-name` / `profile.update-avatar` | |

**Shared catalog stays read-only (Claude's call).** Today `CategoryPolicy` denies create/update/delete
to everyone and catalog exercises (`user_id` null) can't be edited; `catalog:seed` reseeds both on
deploy. That stays as is: there are no `categories.create/update/delete` permissions, and
`exercises.update/delete` only ever apply to a user's own exercises. The category write routes are a
declared exception in the route-walking test (always denied, nothing to tick).

**Permissions gate endpoints, not data (Claude's call).** A permission guards the routes in its row,
nothing more. Data or effects reached through another endpoint follow that endpoint's permission:
`GET /workouts?include_exercises=1` embeds exercises/sets under `workouts.view`; starting from a
template creates exercises/sets under `workouts.create`; a friend's live workout comes with
`friends.view`. No filtering of resources by permission.

**Any combination is allowed (Claude's call).** It's an experiment: the page and API accept any mix
of ticks, even ones that leave a feature unusable (e.g. `workouts.create` without
`workout-sets.create`, `friends.send-request` without `friends.search`). No dependency rules or
validation. The frontend must not crash on such mixes; it just hides what's missing.

The builder may split or merge entries when wiring them reveals a better fit, as long as the
"every endpoint ↔ a permission" rule holds and the catalog stays the single source.

### Wiring the checks

- Each policy method adds the permission check to its existing rule, e.g.
  `return $user->can('workouts.delete') && $workout->user_id === $user->id;`
- Actions that have no policy method today (friend search/list/requests/send, the stats
  controllers that reuse `viewAny Workout`, workout-exercise reorder) get one, or a direct
  `authorize`/`can` check, whichever reads better in that controller. Stats should check
  `stats.view`, not `workouts.view` **(Claude's call)**.

### Syncing permissions and roles

- A seeder/artisan command (idempotent, run on deploy and in tests) creates missing permissions from
  the catalog, deletes permissions no longer in it, and makes sure the `sportiv` role exists.
- A permission that is **newly created** by the sync is also given to `sportiv`, so a new feature
  works for everyone by default; custom roles do not get it automatically **(Claude's call)**.
- A migration (or the same sync, run from a migration) gives `sportiv` to every existing user.
- Registration (`RegistrationService::confirm`) assigns `sportiv` to the new user.

### Role rules

- Role names: free text, unique, trimmed, 2–30 characters **(Claude's call)**.
- `sportiv` cannot be deleted or renamed; its permissions **can** be edited.
- Deleting another role moves its users back to `sportiv`, in one transaction.
- Moving a user replaces their role (`syncRoles`), never adds a second one.

### Admin API (root only)

Under `/api/admin`, `auth:sanctum` + root middleware **(Claude's call on exact shape)**:

- `GET permissions`: the catalog, grouped by area, with labels.
- `GET roles`: roles with their permission names and user counts.
- `POST roles`, `PATCH roles/{role}` (rename), `DELETE roles/{role}`.
- `PUT roles/{role}/permissions`: full list of permission names (sync).
- `GET users?search=`: paginated, search by name/username/email, each with their role.
- `PUT users/{user}/role`: `{ role }`.

### What the frontend gets

- `GET /user` (and the login response) also returns `role` (`root` for the user) and `permissions` (flat list
  of permission names; for root, all of them).
- The auth store exposes a `can(permission)` helper. Buttons, links and pages for actions the user
  lacks are hidden; routes can declare a required permission in `meta` and redirect to the dashboard
  if missing.
- A permission denial is told apart from the existing 403s (ownership, "not your friend", resuming a
  completed workout): the backend answers a missing permission with 403 and
  `{ "code": "permission_denied", "permission": "<name>" }`; other 403s keep their current shape.
  Only `permission_denied` makes the frontend show a short "You're not allowed to do this" message
  and refresh `/user`; `FriendPage` and the others keep handling their own 403s **(Claude's call)**.
  The builder picks the mechanism (e.g. a dedicated exception thrown from a small helper used in the
  policies, rendered in the exception handler).

### The root page

- Route `/admin` (meta `requiresRoot`), linked from the navigation only for root.
- Three parts: **roles** (list, create, rename, delete), **permissions of the selected role**
  (checkboxes grouped by area, with "tick all" per group), **users** (searchable list, change role).
- Visual design is done with the impeccable skill and shown to the user in Chrome before building
  it (the user's standing preference). Layout details are open until then.

## Tests (backend)

- Each permission: a user whose role lacks it gets 403 on its endpoints; with it, behaviour is
  unchanged (the existing feature tests keep passing with `sportiv`).
- Ownership still enforced with the permission present, including for root.
- Root bypasses missing permissions; non-root gets 403 on every `/api/admin` route.
- New accounts get `sportiv`; existing users get it from the migration.
- `sportiv` cannot be deleted/renamed; deleting a role moves users to `sportiv`.
- The sync is idempotent and gives newly created permissions to `sportiv` only.
- Every guarded route maps to a catalog permission (a test that walks the route list) **(Claude's call)**.

## Left to the builder

- Exact class names, file layout, label wording (in the app's existing UI language), pagination size.
- Whether the catalog is a PHP class, enum or config file.
- Spatie cache handling in tests (reset the permission cache in test setup as the package recommends).
- How the frontend hides each control, page by page.
