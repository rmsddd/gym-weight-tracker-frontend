<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { mdiMagnify } from '@mdi/js'
import api from '../services/api'
import authStore from '../stores/auth'
import friendsStore from '../stores/friends'
import Avatar from './ui/Avatar.vue'
import BaseButton from './ui/BaseButton.vue'
import PageLayout from './ui/PageLayout.vue'

const { can } = authStore

const MIN_QUERY = 2
const DEBOUNCE_MS = 300

const query = ref('')
const results = ref([])
const isSearching = ref(false)
const hasSearched = ref(false)
const errorMessage = ref('')
const busyIds = ref(new Set())

let debounceId = null
// Answers can come back out of order; only the latest search may fill the list
let latestSearch = 0

onBeforeUnmount(() => clearTimeout(debounceId))

// The clear button sets the field to null; a leading @ is how usernames are shown, not part of them
const term = computed(() => (query.value ?? '').trim().replace(/^@/, ''))

watch(term, (value) => {
  clearTimeout(debounceId)
  if (value.length < MIN_QUERY) {
    results.value = []
    hasSearched.value = false
    return
  }
  debounceId = setTimeout(() => search(value), DEBOUNCE_MS)
})

async function search(value) {
  const searchId = ++latestSearch
  isSearching.value = true
  errorMessage.value = ''

  try {
    const response = await api.get('/users/search', { params: { q: value } })
    if (searchId !== latestSearch) return
    results.value = response.data.data
    hasSearched.value = true
  } catch (error) {
    if (searchId !== latestSearch) return
    errorMessage.value = 'Could not search right now. Check your connection.'
    console.error('User search failed:', error)
  } finally {
    if (searchId === latestSearch) isSearching.value = false
  }
}

async function act(user, request) {
  if (busyIds.value.has(user.id)) return
  busyIds.value.add(user.id)
  errorMessage.value = ''

  try {
    const response = await request()
    // Sending to someone who already asked you makes you friends straight away
    if (response.status === 201) {
      user.friendship = response.data.data.status === 'accepted' ? 'friends' : 'outgoing'
      user.request_id = response.data.data.id
    } else if (user.friendship === 'incoming') {
      user.friendship = 'friends'
    } else {
      user.friendship = null
      user.request_id = null
    }
    if (can('friends.requests')) friendsStore.refreshIncomingCount()
  } catch (error) {
    errorMessage.value = error.response?.data?.message ?? 'Something went wrong. Try again.'
    console.error('Friend request failed:', error)
  } finally {
    busyIds.value.delete(user.id)
  }
}

const sendRequest = (user) => act(user, () => api.post('/friend-requests', { user_id: user.id }))
const accept = (user) => act(user, () => api.post(`/friend-requests/${user.request_id}/accept`))
const cancel = (user) => act(user, () => api.delete(`/friend-requests/${user.request_id}`))
</script>

<template>
  <PageLayout title="Add friends" :back="{ to: '/friends', label: 'Back' }">

    <v-text-field
      v-model="query"
      :prepend-inner-icon="mdiMagnify"
      :loading="isSearching"
      label="Search by username"
      name="username-search"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      variant="outlined"
      hide-details
      autofocus
      clearable
    />

    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <p v-if="term.length < MIN_QUERY" class="hint">Type at least two letters of a username.</p>
    <p v-else-if="hasSearched && results.length === 0 && !isSearching" class="hint">
      No one goes by a username like “{{ term }}”.
    </p>

    <ul v-if="results.length > 0" class="results" aria-live="polite">
      <li v-for="user in results" :key="user.id" class="result">
        <Avatar :code="user.avatar" :size="40" />
        <span class="who">
          <span class="who-name">{{ user.name }}</span>
          <span class="who-handle">@{{ user.username }}</span>
        </span>

        <RouterLink
          v-if="user.friendship === 'friends'"
          :to="`/friends/${user.username}`"
          class="state-link"
          >Friends</RouterLink
        >
        <template v-else-if="user.friendship === 'outgoing'">
          <span class="state">Sent</span>
          <v-btn
            v-if="can('friends.remove')"
            variant="text"
            size="small"
            :disabled="busyIds.has(user.id)"
            @click="cancel(user)"
            >Cancel</v-btn
          >
        </template>
        <BaseButton
          v-else-if="user.friendship === 'incoming' && can('friends.accept-request')"
          size="sm"
          :disabled="busyIds.has(user.id)"
          @click="accept(user)"
          >Accept</BaseButton
        >
        <BaseButton
          v-else-if="user.friendship == null && can('friends.send-request')"
          size="sm"
          variant="secondary"
          :disabled="busyIds.has(user.id)"
          @click="sendRequest(user)"
          >Add</BaseButton
        >
      </li>
    </ul>
  </PageLayout>
</template>

<style scoped>
.hint {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-subtle);
}

.error {
  margin: 0;
  color: var(--color-danger-text);
  font-size: 14px;
}

.results {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-surface-low);
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

.state {
  font-size: 13px;
  color: var(--color-text-muted);
}

.state-link {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-accent-blush);
  text-decoration: none;
}
</style>
