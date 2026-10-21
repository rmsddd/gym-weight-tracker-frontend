<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mdiPlus } from '@mdi/js'
import api from '../services/api'
import friendsStore from '../stores/friends'
import { usePolling } from '../composables/usePolling'
import { formatElapsed, liveWorkoutSeconds } from '../utils/formatElapsed'
import Avatar from './ui/Avatar.vue'
import BaseButton from './ui/BaseButton.vue'
import PageLayout from './ui/PageLayout.vue'
import SkeletonList from './ui/SkeletonList.vue'

const POLL_MS = 15000

const router = useRouter()

const friends = ref([])
const incoming = ref([])
const outgoing = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
// Ids of requests with an answer on its way, so a double tap sends it once
const busyRequests = ref(new Set())

const now = ref(Date.now())
const clockId = setInterval(() => (now.value = Date.now()), 1000)
onBeforeUnmount(() => clearInterval(clockId))

async function load() {
  try {
    const [friendsRes, requests] = await Promise.all([
      api.get('/friends'),
      friendsStore.fetchRequests(),
    ])
    friends.value = friendsRes.data.data
    incoming.value = requests.incoming
    outgoing.value = requests.outgoing
    errorMessage.value = ''
  } catch (error) {
    // Keep showing the last list; only the very first load has nothing to fall back on
    if (isLoading.value) errorMessage.value = 'Could not load your friends. Check your connection.'
    console.error('Failed to load friends:', error)
  } finally {
    isLoading.value = false
  }
}

const { refresh } = usePolling(load, () => POLL_MS)

const atTheGym = computed(() => friends.value.filter((friend) => friend.online))

function firstName(user) {
  return user.name.split(' ')[0]
}

function liveTime(friend) {
  return formatElapsed(liveWorkoutSeconds(friend.live_workout, now.value))
}

function isStopped(friend) {
  return friend.live_workout?.finished_at != null
}

async function answer(request, action) {
  if (busyRequests.value.has(request.id)) return
  busyRequests.value.add(request.id)

  try {
    if (action === 'accept') await api.post(`/friend-requests/${request.id}/accept`)
    else await api.delete(`/friend-requests/${request.id}`)
    await refresh()
  } catch (error) {
    errorMessage.value = 'Could not answer the request. Try again.'
    console.error('Failed to answer friend request:', error)
  } finally {
    busyRequests.value.delete(request.id)
  }
}
</script>

<template>
  <PageLayout title="Friends">
    <template #actions>
      <BaseButton size="sm" :prepend-icon="mdiPlus" @click="router.push('/friends/add')"
        >Add friends</BaseButton
      >
    </template>

    <SkeletonList v-if="isLoading" :rows="4" />
    <p v-else-if="errorMessage && friends.length === 0" class="error" role="alert">
      {{ errorMessage }}
    </p>

    <template v-else>
      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <section v-if="atTheGym.length > 0" aria-labelledby="gym-title">
        <h2 id="gym-title" class="section-title">At the gym now</h2>
        <ul class="strip">
          <li v-for="friend in atTheGym" :key="friend.id">
            <RouterLink :to="`/friends/${friend.username}`" class="strip-item">
              <span class="ring" :class="{ stopped: isStopped(friend) }">
                <Avatar :code="friend.avatar" :size="58" />
              </span>
              <span class="strip-name">{{ firstName(friend) }}</span>
              <span v-if="isStopped(friend)" class="strip-time stopped">Stopped</span>
              <span v-else class="strip-time">{{ liveTime(friend) }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="incoming.length > 0 || outgoing.length > 0" aria-labelledby="requests-title">
        <h2 id="requests-title" class="section-title">Requests</h2>
        <ul class="requests">
          <li v-for="request in incoming" :key="request.id" class="request">
            <Avatar :code="request.user.avatar" :size="40" />
            <span class="who">
              <span class="who-name">{{ request.user.name }}</span>
              <span class="who-handle">@{{ request.user.username }}</span>
            </span>
            <BaseButton
              size="sm"
              :disabled="busyRequests.has(request.id)"
              @click="answer(request, 'accept')"
              >Accept</BaseButton
            >
            <BaseButton
              size="sm"
              variant="secondary"
              :disabled="busyRequests.has(request.id)"
              @click="answer(request, 'decline')"
              >Decline</BaseButton
            >
          </li>
          <li v-for="request in outgoing" :key="request.id" class="request">
            <Avatar :code="request.user.avatar" :size="40" />
            <span class="who">
              <span class="who-name">{{ request.user.name }}</span>
              <span class="who-handle">Request sent</span>
            </span>
            <v-btn
              variant="text"
              size="small"
              :disabled="busyRequests.has(request.id)"
              @click="answer(request, 'cancel')"
              >Cancel</v-btn
            >
          </li>
        </ul>
      </section>

      <section aria-labelledby="all-title">
        <h2 id="all-title" class="section-title">All friends · {{ friends.length }}</h2>

        <div v-if="friends.length === 0" class="empty">
          <p class="empty-title">No friends yet</p>
          <p class="empty-text">
            Find someone by their username and send a request. Once they accept, you see when
            they're at the gym and what they lift.
          </p>
          <BaseButton @click="router.push('/friends/add')">Add friends</BaseButton>
        </div>

        <ul v-else class="friend-list">
          <li v-for="friend in friends" :key="friend.id">
            <RouterLink :to="`/friends/${friend.username}`" class="friend-row pressable">
              <Avatar :code="friend.avatar" :size="40" />
              <span class="friend-name">{{ friend.name }}</span>
              <span class="friend-status" :class="{ online: friend.online }">
                {{ friend.online ? 'At the gym' : 'Offline' }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </template>
  </PageLayout>
</template>

<style scoped>
.section-title {
  margin: 8px 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.strip {
  display: flex;
  gap: 18px;
  margin: 0;
  padding: 0 0 4px;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.strip-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 72px;
  color: inherit;
  text-decoration: none;
}

/* The magenta ring is the live signal; a stopped workout keeps it, greyed */
.ring {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 3px solid var(--color-accent);
  transition: transform 0.15s var(--ease-out);
}

.ring.stopped {
  border-color: var(--color-text-faint);
}

.strip-item:active .ring {
  transform: scale(0.95);
}

.strip-name {
  max-width: 100%;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strip-time {
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
}

.strip-time.stopped {
  font-weight: 700;
  color: var(--color-text-muted);
}

.requests,
.friend-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.requests {
  gap: 10px;
}

.request {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
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

.friend-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 4px;
  border-bottom: 1px solid var(--color-surface-low);
  border-radius: var(--radius-menu);
  color: inherit;
  text-decoration: none;
}

.friend-row:hover {
  background: var(--color-surface-hover);
}

.friend-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-status {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-faint);
}

.friend-status.online {
  color: var(--color-accent-blush);
}

.empty {
  padding: 20px 22px;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
}

.empty-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
}

.empty-text {
  margin: 0 0 16px;
  max-width: 46ch;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.error {
  margin: 0;
  color: var(--color-danger-text);
  font-size: 14px;
}
</style>
