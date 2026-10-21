<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { mdiDeleteOutline, mdiMagnify, mdiPencilOutline, mdiPlus } from '@mdi/js'
import adminApi from '../services/admin'
import notice from '../stores/notice'
import Avatar from './ui/Avatar.vue'
import BaseButton from './ui/BaseButton.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'
import PageLayout from './ui/PageLayout.vue'
import SkeletonList from './ui/SkeletonList.vue'

const SEARCH_DEBOUNCE_MS = 300
const SAVE_DEBOUNCE_MS = 400

const roles = ref([])
const groups = ref([])
const isLoading = ref(true)
const loadError = ref('')
// null shows everyone; a role id narrows the people to that role and opens its permissions
const selectedRoleId = ref(null)
const tab = ref('people')

const selectedRole = computed(
  () => roles.value.find((role) => role.id === selectedRoleId.value) ?? null,
)
const roleNames = computed(() => roles.value.map((role) => role.name))

// ----- People -----

const users = ref([])
const allCount = ref(null)
const search = ref('')
const page = ref(1)
const lastPage = ref(1)
const isLoadingUsers = ref(false)
// Ids of people whose new role is on its way, so their select waits for the answer
const movingIds = ref(new Set())
let searchTimer = null
// Only the newest request may fill the list, so a slow old search cannot overwrite a newer one
let usersRequest = 0

async function loadUsers({ more = false } = {}) {
  const request = ++usersRequest
  isLoadingUsers.value = true

  try {
    const response = await adminApi.users({
      search: search.value || undefined,
      role: selectedRole.value?.name,
      page: more ? page.value + 1 : 1,
    })
    if (request !== usersRequest) return

    users.value = more ? [...users.value, ...response.data] : response.data
    page.value = response.meta.current_page
    lastPage.value = response.meta.last_page
    if (!search.value && !selectedRole.value) allCount.value = response.meta.total
  } catch (error) {
    if (request === usersRequest) notice.show('Could not load the people. Try again.')
    console.error('Failed to load users:', error)
  } finally {
    if (request === usersRequest) isLoadingUsers.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadUsers(), SEARCH_DEBOUNCE_MS)
})

async function moveUser(user, roleName) {
  if (roleName === user.role) return
  movingIds.value.add(user.id)

  try {
    const moved = await adminApi.setUserRole(user.id, roleName)
    user.role = moved.role
    // Someone moved out of the role being shown no longer belongs in its list
    if (selectedRole.value && moved.role !== selectedRole.value.name) {
      users.value = users.value.filter((u) => u.id !== user.id)
    }
    await loadRoles()
  } catch (error) {
    notice.show(error.response?.data?.message ?? 'Could not change the role. Try again.')
    console.error('Failed to move user:', error)
  } finally {
    movingIds.value.delete(user.id)
  }
}

// ----- Roles and their permissions -----

async function loadRoles() {
  const fresh = await adminApi.roles()
  // A role with ticks still on their way keeps them, not the server's older list
  roles.value = fresh.map((role) => {
    const shown = roles.value.find((r) => r.id === role.id)
    return shown && saveState.value[role.id] === 'saving'
      ? { ...role, permissions: shown.permissions }
      : role
  })
}

function selectRole(id) {
  selectedRoleId.value = id
  if (id === null) tab.value = 'people'
  loadUsers()
}

function hasPermission(name) {
  return selectedRole.value?.permissions.includes(name) ?? false
}

function groupState(group) {
  const ticked = group.permissions.filter((p) => hasPermission(p.name)).length
  if (ticked === 0) return 'none'
  return ticked === group.permissions.length ? 'all' : 'some'
}

function togglePermission(name) {
  const role = selectedRole.value
  role.permissions = hasPermission(name)
    ? role.permissions.filter((p) => p !== name)
    : [...role.permissions, name]
  scheduleSave(role)
}

// A group ticked only partly gets ticked fully; a full one gets cleared
function toggleGroup(group) {
  const role = selectedRole.value
  const names = group.permissions.map((p) => p.name)
  role.permissions =
    groupState(group) === 'all'
      ? role.permissions.filter((p) => !names.includes(p))
      : [...new Set([...role.permissions, ...names])]
  scheduleSave(role)
}

// Each tick shows at once and a burst of ticks goes out as one request with the whole list. The
// last list the server accepted is kept, so a failed save can put the checkboxes back
const saveTimers = new Map()
const savedPermissions = new Map()
// Counts the changes per role, so only the answer to the newest one says "Saved"
const changeCounts = new Map()
const saveState = ref({})

function scheduleSave(role) {
  changeCounts.set(role.id, (changeCounts.get(role.id) ?? 0) + 1)
  saveState.value[role.id] = 'saving'
  clearTimeout(saveTimers.get(role.id))
  saveTimers.set(
    role.id,
    setTimeout(() => savePermissions(role), SAVE_DEBOUNCE_MS),
  )
}

async function savePermissions(role) {
  saveTimers.delete(role.id)
  const change = changeCounts.get(role.id)

  try {
    const saved = await adminApi.setPermissions(role.id, [...role.permissions])
    savedPermissions.set(role.id, saved.permissions)
    if (changeCounts.get(role.id) === change) saveState.value[role.id] = 'saved'
  } catch (error) {
    role.permissions = savedPermissions.get(role.id) ?? role.permissions
    saveState.value[role.id] = null
    notice.show(`Could not save the permissions of ${role.name}. They are back as they were.`)
    console.error('Failed to save permissions:', error)
  }
}

// Put the permissions saved for each role as their baseline once the roles arrive
watch(roles, (list) => list.forEach((role) => savedPermissions.set(role.id, role.permissions)))

// ----- Create, rename, delete -----

const isRoleDialogOpen = ref(false)
const roleDialogMode = ref('create')
const roleName = ref('')
const roleNameError = ref('')
const isSavingRole = ref(false)

function openCreate() {
  roleDialogMode.value = 'create'
  roleName.value = ''
  roleNameError.value = ''
  isRoleDialogOpen.value = true
}

function openRename() {
  roleDialogMode.value = 'rename'
  roleName.value = selectedRole.value.name
  roleNameError.value = ''
  isRoleDialogOpen.value = true
}

async function saveRole() {
  if (!roleName.value.trim() || isSavingRole.value) return
  isSavingRole.value = true
  roleNameError.value = ''

  try {
    if (roleDialogMode.value === 'create') {
      const role = await adminApi.createRole(roleName.value.trim())
      await loadRoles()
      // A new role starts with nothing ticked, so its permissions are the next thing to set
      selectedRoleId.value = role.id
      tab.value = 'permissions'
      loadUsers()
    } else {
      await adminApi.renameRole(selectedRole.value.id, roleName.value.trim())
      await loadRoles()
      loadUsers()
    }
    isRoleDialogOpen.value = false
  } catch (error) {
    roleNameError.value =
      error.response?.data?.errors?.name?.[0] ??
      error.response?.data?.message ??
      'Could not save the role. Try again.'
    console.error('Failed to save role:', error)
  } finally {
    isSavingRole.value = false
  }
}

const isDeleteOpen = ref(false)
const isDeleting = ref(false)

const deleteMessage = computed(() => {
  const count = selectedRole.value?.users_count ?? 0
  if (count === 0) return 'Nobody has this role.'
  return `${count === 1 ? 'The 1 person' : `Its ${count} people`} with it will move to sportiv.`
})

async function confirmDelete() {
  isDeleting.value = true

  try {
    await adminApi.deleteRole(selectedRole.value.id)
    isDeleteOpen.value = false
    selectedRoleId.value = null
    tab.value = 'people'
    await loadRoles()
    loadUsers()
  } catch (error) {
    notice.show(error.response?.data?.message ?? 'Could not delete the role. Try again.')
    console.error('Failed to delete role:', error)
  } finally {
    isDeleting.value = false
  }
}

onMounted(async () => {
  try {
    const [roleList, groupList] = await Promise.all([adminApi.roles(), adminApi.permissions()])
    roles.value = roleList
    groups.value = groupList
  } catch (error) {
    loadError.value = 'Could not load the roles. Check your connection.'
    console.error('Failed to load roles:', error)
  } finally {
    isLoading.value = false
  }
  loadUsers()
})

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
  // Ticks still waiting for their debounce are sent rather than lost
  saveTimers.forEach((timer, id) => {
    clearTimeout(timer)
    const role = roles.value.find((r) => r.id === id)
    if (role) savePermissions(role)
  })
})
</script>

<template>
  <PageLayout title="Admin" wide>
    <SkeletonList v-if="isLoading" :rows="4" />
    <p v-else-if="loadError" class="error" role="alert">{{ loadError }}</p>

    <div v-else class="workspace">
      <nav class="role-rail" aria-label="Roles">
        <h2 class="section-title">Roles</h2>
        <button
          type="button"
          class="role-item"
          :class="{ active: selectedRoleId === null }"
          :aria-pressed="selectedRoleId === null"
          @click="selectRole(null)"
        >
          <span class="role-name">All people</span>
          <span v-if="allCount !== null" class="count">{{ allCount }}</span>
        </button>
        <button
          v-for="role in roles"
          :key="role.id"
          type="button"
          class="role-item"
          :class="{ active: selectedRoleId === role.id }"
          :aria-pressed="selectedRoleId === role.id"
          @click="selectRole(role.id)"
        >
          <span class="role-name">
            {{ role.name }}
            <span v-if="role.is_default" class="mark">Default</span>
          </span>
          <span class="count">{{ role.users_count }}</span>
        </button>
        <button type="button" class="new-role" @click="openCreate">
          <v-icon :icon="mdiPlus" size="18" />
          New role
        </button>
      </nav>

      <section class="pane" :aria-label="selectedRole ? `Role ${selectedRole.name}` : 'All people'">
        <header v-if="selectedRole" class="pane-head">
          <h2 class="pane-title">{{ selectedRole.name }}</h2>
          <div v-if="!selectedRole.is_default" class="pane-actions">
            <v-btn variant="text" size="small" :prepend-icon="mdiPencilOutline" @click="openRename">
              Rename
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              color="error"
              :prepend-icon="mdiDeleteOutline"
              @click="isDeleteOpen = true"
            >
              Delete
            </v-btn>
          </div>
        </header>

        <v-tabs v-if="selectedRole" v-model="tab" color="primary" density="compact" class="tabs">
          <v-tab value="people">People · {{ selectedRole.users_count }}</v-tab>
          <v-tab value="permissions">Permissions</v-tab>
        </v-tabs>

        <template v-if="tab === 'people' || !selectedRole">
          <v-text-field
            v-model="search"
            :prepend-inner-icon="mdiMagnify"
            placeholder="Search name, @username or email"
            aria-label="Search people"
            autocomplete="off"
            name="admin-search"
            clearable
            density="compact"
            hide-details
          />

          <SkeletonList v-if="isLoadingUsers && users.length === 0" :rows="4" />
          <p v-else-if="users.length === 0" class="quiet">
            {{ search ? `Nobody matches “${search}”.` : 'Nobody has this role yet.' }}
          </p>
          <ul v-else class="people">
            <li v-for="user in users" :key="user.id" class="person">
              <Avatar :code="user.avatar" :size="40" />
              <span class="who">
                <span class="who-name">{{ user.name }}</span>
                <span class="who-handle">
                  <template v-if="user.username">@{{ user.username }} · </template>{{ user.email }}
                </span>
              </span>
              <span v-if="user.role === 'root'" class="root-tag">root</span>
              <v-select
                v-else
                :model-value="user.role"
                :items="roleNames"
                :loading="movingIds.has(user.id)"
                :disabled="movingIds.has(user.id)"
                :aria-label="`Role of ${user.name}`"
                density="compact"
                hide-details
                class="role-select"
                @update:model-value="moveUser(user, $event)"
              />
            </li>
          </ul>
          <v-btn
            v-if="page < lastPage"
            variant="text"
            class="load-more"
            :loading="isLoadingUsers"
            @click="loadUsers({ more: true })"
          >
            Load more
          </v-btn>
        </template>

        <template v-else>
          <p class="hint">
            Changes save on their own and apply at once to everyone with this role.
            <span v-if="saveState[selectedRole.id]" class="save-state" aria-live="polite">
              {{ saveState[selectedRole.id] === 'saving' ? 'Saving…' : 'Saved' }}
            </span>
          </p>

          <section v-for="group in groups" :key="group.key" class="perm-group">
            <div class="group-head">
              <h3 class="group-title">{{ group.label }}</h3>
              <v-checkbox
                :model-value="groupState(group) === 'all'"
                :indeterminate="groupState(group) === 'some'"
                :label="groupState(group) === 'all' ? 'Untick all' : 'Tick all'"
                color="primary"
                density="compact"
                hide-details
                class="group-toggle"
                @update:model-value="toggleGroup(group)"
              />
            </div>
            <v-checkbox
              v-for="permission in group.permissions"
              :key="permission.name"
              :model-value="hasPermission(permission.name)"
              :label="permission.label"
              color="primary"
              density="compact"
              hide-details
              @update:model-value="togglePermission(permission.name)"
            />
          </section>
        </template>
      </section>
    </div>

    <v-dialog v-model="isRoleDialogOpen" max-width="360" :persistent="isSavingRole">
      <v-card color="surface-bright" border class="role-dialog">
        <h2 class="dialog-title">{{ roleDialogMode === 'create' ? 'New role' : 'Rename role' }}</h2>
        <p v-if="roleDialogMode === 'create'" class="dialog-hint">
          It starts with nothing ticked. Choose its permissions next.
        </p>
        <v-text-field
          v-model="roleName"
          placeholder="limitat"
          aria-label="Role name"
          autocomplete="off"
          name="role-name"
          density="compact"
          :error-messages="roleNameError"
          autofocus
          @keydown.enter="saveRole"
        />
        <div class="dialog-actions">
          <v-btn variant="outlined" :disabled="isSavingRole" @click="isRoleDialogOpen = false">
            Cancel
          </v-btn>
          <BaseButton :loading="isSavingRole" :disabled="!roleName.trim()" @click="saveRole">
            {{ roleDialogMode === 'create' ? 'Create' : 'Rename' }}
          </BaseButton>
        </div>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="isDeleteOpen"
      :title="`Delete ${selectedRole?.name}?`"
      :message="deleteMessage"
      :loading="isDeleting"
      @confirm="confirmDelete"
    />
  </PageLayout>
</template>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0 0 8px 10px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

/* Phone: the roles become a row of chips above the people */
.role-rail {
  display: flex;
  gap: 8px;
  margin: 0 calc(-1 * var(--page-pad-right)) 0 calc(-1 * var(--page-pad-left));
  padding: 2px var(--page-pad-right) 4px var(--page-pad-left);
  overflow-x: auto;
  scrollbar-width: none;
}

.role-rail .section-title {
  display: none;
}

.role-item,
.new-role {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex: none;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-menu);
  background: var(--color-surface-low);
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s var(--ease-out),
    color 0.2s var(--ease-out),
    border-color 0.2s var(--ease-out);
}

.role-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.role-item.active {
  background: var(--color-surface-raised);
  border-color: var(--color-accent);
  color: var(--color-text-primary);
}

.role-name {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}

.mark {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-accent-blush);
}

.count {
  min-width: 24px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--color-night-floor);
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.role-item.active .count {
  background: var(--color-accent-deep);
  color: var(--color-text-primary);
}

.new-role {
  justify-content: center;
  gap: 6px;
  border-style: dashed;
  background: transparent;
  color: var(--color-accent-blush);
}

.new-role:hover {
  border-color: var(--color-accent-blush);
}

.pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.pane-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
}

.pane-actions {
  display: flex;
  gap: 4px;
}

.tabs {
  border-bottom: 1px solid var(--color-divider);
}

.people {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.person {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-divider);
}

.person:last-child {
  border-bottom: none;
}

.who {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.who-name {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.who-handle {
  font-size: 13px;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-select {
  flex: none;
  width: 148px;
}

.root-tag {
  flex: none;
  width: 148px;
  padding-left: 12px;
  font-weight: 800;
  color: var(--color-accent-blush);
}

.save-state {
  margin-left: 6px;
  color: var(--color-accent-blush);
  font-weight: 700;
}

.load-more {
  align-self: center;
}

.quiet,
.hint {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 14px;
}

.perm-group {
  padding: 8px 4px 4px;
  border-bottom: 1px solid var(--color-divider);
}

.perm-group:last-child {
  border-bottom: none;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.group-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.group-toggle {
  flex: none;
}

.group-toggle :deep(.v-label) {
  font-size: 13px;
  color: var(--color-text-muted);
}

.error {
  margin: 0;
  color: var(--color-danger-text);
}

.role-dialog {
  padding: 20px 22px;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
}

.dialog-hint {
  margin: 6px 0 14px;
  color: var(--color-text-muted);
  font-size: 14px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

/* PC: the roles become a rail beside a working pane */
@media (min-width: 900px) {
  .workspace {
    flex-direction: row;
    align-items: flex-start;
    gap: 24px;
  }

  .role-rail {
    position: sticky;
    top: var(--page-pad-top);
    flex-direction: column;
    flex: none;
    width: 260px;
    margin: 0;
    padding: 12px;
    overflow: visible;
    background: var(--color-surface-low);
    border-radius: var(--radius-card);
  }

  .role-rail .section-title {
    display: block;
  }

  .role-item {
    border-color: transparent;
    background: transparent;
  }

  .role-item.active {
    border-color: transparent;
    background: var(--color-surface-raised);
    box-shadow: 0 4px 14px rgba(10, 4, 16, 0.45);
  }

  .new-role {
    margin-top: 8px;
  }

  .pane {
    flex: 1;
    padding: 20px 24px;
    background: var(--color-surface-low);
    border-radius: var(--radius-card);
  }
}
</style>
