# Plan: roles and permissions (spatie/laravel-permission) with a root admin page

Design: `docs/superpowers/specs/2026-10-21-roles-permissions-design.md` (approved 2026-10-21).

Two repos. Backend tasks (1–9) are checked with `php artisan test` (the whole suite must stay green
after every task) and `vendor/bin/pint`. Frontend tasks (10–14) are checked with `npm run lint` and
`npm run build`, and the whole thing in the browser at the end. One commit per task, pushed straight
to `main` in its repo. No Claude attribution trailers, no demo seeders committed.

Backend first: the frontend relies on the `/user` shape and the admin API.

---

## Backend (`gym-weight-tracker-backend`)

### 1. Install the package

- `composer require spatie/laravel-permission` (the latest release that supports Laravel 12).
- `php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"`: this
  publishes `config/permission.php` and the migration creating `roles`, `permissions`,
  `model_has_roles`, `model_has_permissions` and `role_has_permissions`. Keep the defaults (no teams,
  default cache).
- `User` uses `Spatie\Permission\Traits\HasRoles`.
- Hide the relations from serialization: add `roles` and `permissions` to `$hidden`, so `/user` and
  the login response don't dump the raw pivot rows. Task 5 sends the clean shape instead.
- Check that it fits the auth setup before going further. In a scratch test (not committed), a user
  with a `web`-guard permission, authenticated with `Sanctum::actingAs`, should get `true` from
  `$user->can('x')`. Spatie resolves the guard from the `User` provider, which is `web`. If it
  doesn't, set `protected $guard_name = 'web'` on `User`.
- Suite still green, since nothing checks permissions yet.

### 2. Permission catalog

`app/Support/PermissionCatalog.php` (a plain class with constants and static methods, in the same
style as `User::usernameRules()`):

- `GROUPS`: an ordered map `area key => ['label' => ..., 'permissions' => [name => label]]`, with
  exactly the entries in the spec table:
  - workouts: view, create, update, finish, resume, complete, delete
  - workout-exercises: view, create, update, delete
  - workout-sets: view, create, update, delete
  - exercises: view, create, update, delete
  - categories: view
  - templates: view, create, delete
  - stats: view
  - friends: search, view, requests, send-request, accept-request, remove
  - profile: update-name, update-avatar
- Labels are in English, like the rest of the UI (e.g. "Delete workouts").
- `names(): array` returns the flat list. `has(string $ability): bool` checks whether an ability is
  in it.
- `const ROOT = 'root'`, `const DEFAULT_ROLE = 'sportiv'`, `const PROTECTED_ROLES = [ROOT, DEFAULT_ROLE]`.

Unit test: the names are unique and every name matches `^[a-z-]+\.[a-z-]+$`.

### 3. Sync command and deploy

In `routes/console.php`, next to `catalog:seed`, add `permissions:sync`. It must be idempotent and
run in a transaction:

1. Create every catalog permission that is missing (guard `web`), and remember the newly created
   ones.
2. Delete every `web` permission that is not in the catalog.
3. `Role::firstOrCreate` for `root` and `sportiv`.
4. Give the **newly created** permissions to `sportiv` (`givePermissionTo`). The first run therefore
   gives it everything. `root` gets none.
5. Give `sportiv` to every user who has no role (`User::doesntHave('roles')`, chunked).
6. `app(PermissionRegistrar::class)->forgetCachedPermissions()`.

Hook it up in three places:

- **Deploy:** in `docker/start.sh`, after `migrate --force` and before `catalog:seed`, add
  `php artisan permissions:sync`. It runs on every deploy because it's cheap.
- **Existing users:** a migration `2026_10_21_200000_sync_roles_and_permissions.php` whose `up()`
  calls `Artisan::call('permissions:sync')`. That way existing users get `sportiv` even before the
  start script runs. `down()` does nothing.
- **Tests:** `Tests\TestCase::setUp()` runs `permissions:sync` after the parent `setUp`, once
  `RefreshDatabase` has migrated. Simpler still: since the migration runs the sync, the tables are
  already filled. Check which of the two works, and keep only one. In either case, reset Spatie's
  cache in `setUp`.

Tests (`tests/Feature/PermissionSyncTest.php`):

- After the sync, every catalog name exists and `sportiv` has all of them.
- A second run changes nothing.
- An extra permission in the DB gets deleted.
- If a name is removed from `sportiv` and a new one is added to the catalog (via a
  config/override hook, or by deleting it from the DB and running again), the sync gives back only
  the new one. This needs a way to fake the catalog in a test: let `PermissionCatalog` read an
  overridable static, or pass it in. Choose whichever reads cleaner.
- `root` exists and has no permissions.

### 4. New users get `sportiv`, root bypasses permissions

- `User::booted()`: `static::created(fn (User $user) => $user->assignRole(PermissionCatalog::DEFAULT_ROLE))`.
  This covers registration (`RegistrationService::confirm` uses `forceCreate`, which still fires
  `created`), factories in tests and tinker. It applies only if the role exists: guard it with
  `Role::where('name', ...)->exists()`, or let it fail loudly. **Decision:** let it fail loudly, since
  the sync always runs before the app is used and a silent miss would leave a user without a role.
- `AppServiceProvider::boot()` gets `registerRootBypass()`:
  ```php
  Gate::before(fn (User $user, string $ability) =>
      PermissionCatalog::has($ability) && $user->hasRole(PermissionCatalog::ROOT) ? true : null);
  ```
  It returns `null` for policy abilities (`update`, `delete`…), so ownership is still checked for
  root.

Tests (`tests/Feature/RolesTest.php`):

- A factory user has `sportiv`.
- Confirming a registration gives the user `sportiv` (reuse the flow from `EmailVerificationTest`).
- For a user with `root`, `can('workouts.delete')` is true even with no permissions, and
  `can('delete', $someoneElsesWorkout)` is false.

### 5. Denials with `permission_denied`, and the policy wiring

**Helper and exception.** Add `app/Exceptions/PermissionDenied.php`, an exception that carries the
permission name, and a trait or small helper `App\Policies\Concerns\ChecksPermissions`:

```php
protected function permitted(User $user, string $permission): void
{
    if (! $user->can($permission)) {
        throw new PermissionDenied($permission);
    }
}
```

In `bootstrap/app.php` `withExceptions`, render it as `403` with
`{ "message": "You're not allowed to do this.", "code": "permission_denied", "permission": "<name>" }`.
Other 403s (`AuthorizationException` from policies returning `false`, `EnsureUserHasUsername`) keep
their current shape.

**Wiring.** Each method first calls `$this->permitted($user, '<perm>')`, then returns the existing
rule, unchanged:

| Policy method | Permission |
|---------------|------------|
| `WorkoutPolicy` viewAny, view | `workouts.view` |
| create / update / finish / resume / complete / delete | `workouts.<same>` |
| `WorkoutExercisePolicy` viewAny, view / create / update / delete | `workout-exercises.view` / `.create` / `.update` / `.delete` |
| `WorkoutSetPolicy` same four | `workout-sets.*` |
| `ExercisePolicy` viewAny, view / create / update / delete | `exercises.*` |
| `CategoryPolicy` viewAny, view | `categories.view` (create/update/delete stay `false`, with no permission) |
| `WorkoutTemplatePolicy` viewAny, view / create / delete | `templates.*` |
| `UserPolicy::viewWorkouts` | `friends.view` |
| `FriendshipPolicy::accept` | `friends.accept-request` |
| `FriendshipPolicy::delete` | `friends.remove` |

Points to watch:

- `WorkoutExercisePolicy` and `WorkoutSetPolicy` defer to `$user->can('view'|'update', $workout)`.
  That inner call would also demand `workouts.view`/`workouts.update`. The spec says a permission
  gates its own endpoint, so the nested policies must check **ownership directly** (compare
  `user_id` through the workout) instead of going through `WorkoutPolicy`. Otherwise unticking
  `workouts.update` would also block adding sets.
- A denial thrown from a policy turns into the `permission_denied` response. A policy returning
  `false` keeps the normal 403. That difference is exactly what the frontend relies on.
- `UserPolicy::update` is shared by the name and avatar endpoints, so it can't carry one
  permission. Add `updateName` and `updateAvatar` methods (each checks `profile.update-*` and then
  `update`), and point the two controllers at them. `setUsername` stays without a permission (per
  the spec).

**Actions with no policy today:**

- `FriendController::search` → `friends.search`. `index` → `friends.view`. `requests` →
  `friends.requests`. `sendRequest` → `friends.send-request`. `destroy` → `friends.remove`. Add
  `UserPolicy` abilities `searchUsers`, `viewFriends`, `viewFriendRequests`, `sendFriendRequest`,
  `removeFriend` (taking only `$user`, called with `authorize('x', User::class)`). This matches how
  the rest of the controllers read.
- The four stats controllers → `authorize('viewStats', Workout::class)`. Add a
  `WorkoutPolicy::viewStats` that checks `stats.view`. Today they call `viewAny`, which would demand
  `workouts.view`.
- `WorkoutExerciseController::reorder` → `authorize('update', $workout)`, i.e. `workouts.update`,
  as the spec table says.
- `WorkoutTemplateController::fromWorkout` → `templates.create` only. Its `authorize('view', $workout)`
  must not demand `workouts.view`: replace it with a direct ownership check, or a policy method
  `WorkoutPolicy::own`. Same principle as the nested policies.

**Tests.** `tests/Feature/PermissionEnforcementTest.php` is driven by a data provider: one row per
catalog permission, holding the request(s) it guards (method, URI built from fixtures) and the
expected status with the permission (the endpoint's normal success code). For each row:

1. A `sportiv` user who owns the fixtures gets the success code.
2. Revoke that permission from `sportiv`, reset the cache, and repeat: the user gets `403` with
   `code = permission_denied` and `permission = <name>`.

Plus:

- Ownership is still enforced: another user's workout gives `403` (or `404`) **without**
  `permission_denied`, even for root.
- `FriendPage`'s case (not friends) still returns a plain `403`.
- Resuming a completed workout still returns a plain `403`.

All existing feature tests must pass unchanged.

### 6. Route coverage test

In `RouteProtectionTest`, add `test_every_authenticated_route_is_guarded_by_a_permission`. It holds
a hand-kept map `"METHOD uri" => permission`, covering every `auth:sanctum` route except an explicit
exceptions list:

- `logout`, `user`, `user/username`;
- the category write routes (`POST/PUT/PATCH/DELETE categories…`), since they are always denied;
- everything under `api/admin/*`, which is covered by the root middleware.

The test fails when a route is in neither the map nor the exceptions, or when a catalog permission
appears in no route. It doesn't prove the check sits in the controller (task 5's test does that).
It proves that nothing new slips by unmapped. **Decision:** keep this map next to the data provider
from task 5, so a single list drives both tests.

### 7. `/user` and login return role and permissions

Add `User::accessSummary(): array`, which returns
`['role' => <name>, 'permissions' => <list of names>]`. For root, `permissions` is
`PermissionCatalog::names()`. Otherwise it's `getAllPermissions()->pluck('name')`.

- `GET /user` returns `[...$user->toArray(), ...$user->accessSummary()]` (flat, as today).
- `AuthController::login` returns that same array under `user`.

Do not append `permissions` as a model attribute: it clashes with Spatie's `permissions()`
relation.

Test: `/user` for a `sportiv` user with one permission revoked returns a `permissions` list
without it. For root, it returns all of them with `role = root`.

### 8. Admin API

- **Middleware.** `App\Http\Middleware\EnsureUserIsRoot` returns `403 { message }` unless
  `hasRole('root')`.
- **Routes.** In `routes/api.php`, inside the `auth:sanctum` group:
  `Route::prefix('admin')->middleware(EnsureUserIsRoot::class)->group(...)`.
- **Controllers** in `App\Http\Controllers\Api\Admin`, with the logic in
  `App\Services\RoleService` (the repo already puts logic in services):

| Route | Does |
|-------|------|
| `GET admin/permissions` | `PermissionCatalog::GROUPS`, shaped as `[{ key, label, permissions: [{ name, label }] }]` |
| `GET admin/roles` | every role except `root`, ordered with `sportiv` first and then by name: `{ id, name, is_default, users_count, permissions: [names] }` |
| `POST admin/roles` | `{ name }`. Validation: required, string, trimmed, 2–30, unique among roles, not `root` (case-insensitive). The new role gets **no** permissions. |
| `PATCH admin/roles/{role}` | rename. Same rules. `422` if the role is protected. |
| `DELETE admin/roles/{role}` | `422` if protected. In a transaction, the role's users move to `sportiv`, then the role is deleted. |
| `PUT admin/roles/{role}/permissions` | `{ permissions: [names] }`, each `in:` the catalog. `syncPermissions`. `422` for `root`. `sportiv` is allowed. |
| `GET admin/users?search=` | paginated 20 at a time, matching name/username/email with `LIKE`, ordered by name: `{ id, name, username, email, avatar, role }`. Root appears in the list with `role = root`. |
| `PUT admin/users/{user}/role` | `{ role }`. It must exist and not be `root`. `422` if the user currently has `root`. `syncRoles`. |

- The `{role}` binding resolves Spatie's `Role` by id. If `root` is reached by id, these routes treat
  it as protected (`422`), or `404` where the route lists roles.
- Use Form Requests for the bodies, as the repo does (`app/Http/Requests`).
- Clear Spatie's cache after each write. The package does this on its own models, but check the
  role deletion path.

Tests (`tests/Feature/AdminApiTest.php`):

- A non-root user gets `403` on every admin route (iterate over them).
- Full CRUD on a role works.
- `sportiv` can't be deleted or renamed, but its permissions can be edited.
- `root` can't be edited, deleted, reassigned or created.
- Deleting a role moves its users to `sportiv`.
- Moving a user replaces their role.
- Root can't be moved.
- Unticking a permission on a role takes effect on that role's user's next request.

### 9. Backend wrap-up

Run `vendor/bin/pint`, then the full `php artisan test`. Update `README.md` if it lists the setup
steps: the tinker line for making the account root, and `permissions:sync`.

---

## Frontend (`gym-weight-tracker-frontend`)

### 10. Auth store: role, permissions, `can()`

`src/stores/auth.js`:

- `can(permission)` returns `state.user?.permissions?.includes(permission) ?? false`.
- `isRoot()` returns `state.user?.role === 'root'`.
- Export both.

`src/services/api.js`: in the response interceptor, on `403` with
`error.response.data?.code === 'permission_denied'`:

- call `authStore.fetchUser()` to refresh the permissions;
- show the message through a small global snackbar store (`src/stores/notice.js` with
  `state.message` and `show(text)`), rendered once in `App.vue` as a `v-snackbar`. If the app
  already has a snackbar pattern, use that instead.

Other 403s pass through untouched.

### 11. Hide what the user can't do

Go page by page and wrap each control in `v-if="can('...')"`. At minimum:

- **Dashboard / start workout:** `workouts.create`.
- **Active workout:**
  - add exercise: `workout-exercises.create`
  - remove exercise: `workout-exercises.delete`
  - reorder: `workouts.update`
  - add / edit / delete sets: `workout-sets.*`
  - finish, resume, complete: `workouts.finish`, `workouts.resume`, `workouts.complete`
  - save as template: `templates.create`
- **History:** `workouts.view` for the page, `workouts.delete` for the delete button.
- **Templates:** `templates.view`, `.create`, `.delete`.
- **Records and profile stats:** `stats.view`.
- **Friends:**
  - list: `friends.view`
  - add-friends page / search: `friends.search`
  - send request: `friends.send-request`
  - incoming requests: `friends.requests`
  - accept: `friends.accept-request`
  - decline / cancel / unfriend: `friends.remove`
- **Custom exercises:** create / edit / delete: `exercises.*`.
- **Profile:** name `profile.update-name`, avatar `profile.update-avatar`.

Routes declare `meta.permission` where the whole page depends on one permission (history, templates,
records, friends, friends/add). In `router.beforeEach`, if `!authStore.can(to.meta.permission)`,
redirect to the dashboard. In `AppNav`, hide nav entries the same way.

Odd mixes must not crash a page. A store that fails to load (e.g. the catalog without
`exercises.view`) leaves its section empty instead of throwing. Check `stores/catalog.js` and
`friends.js` for unhandled rejections.

### 12. Design the root page (impeccable, shown in Chrome)

Use the impeccable skill to design `/admin`, matching the existing tokens (`src/assets/tokens.css`)
and Vuetify setup. Show the mockups to the user in Chrome at phone width (390px) and PC width
(1280px). The page has three parts:

- **Roles:** list, create, rename and delete. `sportiv` is marked as the default and can't be
  deleted.
- **Permissions of the selected role:** checkboxes grouped by area, with "tick all" per group.
- **Users:** search, then a role picker per user. Root shows "root" and no picker.

Save the mockups under `docs/superpowers/mockups/2026-10-21-admin-*.html`. **Stop and get the user's
approval on the layout before task 13.**

### 13. Build the root page

- **Service.** `src/services/admin.js` wraps the task 8 endpoints.
- **Page.** `src/components/AdminPage.vue` builds the approved layout. Each checkbox change sends
  `PUT roles/{id}/permissions` with the whole list:
  - debounced around 400ms per role;
  - optimistic, and rolled back with a notice if the request fails.
- **Role actions.**
  - Create and rename go through a small dialog showing the server's `422` messages.
  - Delete asks for confirmation in a `v-dialog`, not `window.confirm`: "Its N users will move to
    sportiv".
- **User list.** Search is debounced and paginated with "Load more" or `v-pagination`.
  `PUT users/{id}/role` runs when a role is picked.
- **Root's own permissions.** If root edits the role a user has, nothing needs refreshing for root:
  root's own permissions never change.
- **Route and nav.** Route `/admin` gets `meta: { requiresAuth: true, requiresRoot: true }`, guarded
  in `beforeEach`: non-root goes to the dashboard. `AppNav` (rail and profile area) gets an "Admin"
  entry for root only, placed according to the approved mockup.

### 14. Check in the browser

Run the backend locally (`php artisan serve`) and the frontend (`npm run dev`), set your account to
root from tinker, and use a second, `sportiv` account:

1. As root, untick `workouts.delete` on `sportiv`. As the second account, the delete button is gone
   from History. A direct `DELETE` call returns `permission_denied`.
2. Create a role `limitat` with only the workout permissions and move the second account into it.
   Friends and templates disappear from the nav, and their URLs redirect to the dashboard.
3. Delete `limitat`. The second account is back on `sportiv` with everything it had.
4. As root, try the protected cases from the page: deleting `sportiv`, or naming a role `root`. The
   page shows the server's error.
5. Check phone (390px) and PC (1280px) widths.

Report what was checked and anything that didn't work. Don't call it done until all of this passes.
