<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mdiArrowLeft, mdiChevronDown } from '@mdi/js'
import api from '../services/api'
import { usePolling } from '../composables/usePolling'
import { formatElapsed, liveWorkoutSeconds } from '../utils/formatElapsed'
import { formatSet } from '../utils/formatSet'
import Avatar from './ui/Avatar.vue'
import BaseButton from './ui/BaseButton.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'
import PageLayout from './ui/PageLayout.vue'
import SkeletonList from './ui/SkeletonList.vue'

// Quick while they train, so a new set shows up within seconds; slow while they are away
const ONLINE_POLL_MS = 5000
const OFFLINE_POLL_MS = 30000

const route = useRoute()
const router = useRouter()

const friend = ref(null)
const isLoading = ref(true)
const loadError = ref('')
const openWorkouts = ref(new Set())
const isRemoveOpen = ref(false)
const isRemoving = ref(false)

const now = ref(Date.now())
const clockId = setInterval(() => (now.value = Date.now()), 1000)
onBeforeUnmount(() => clearInterval(clockId))

async function load() {
  try {
    const response = await api.get(`/friends/${route.params.username}`)
    friend.value = response.data.data
    loadError.value = ''
  } catch (error) {
    const status = error.response?.status
    if (status === 403 || status === 404) {
      friend.value = null
      loadError.value = 'You can only see the workouts of your friends.'
    } else if (!friend.value) {
      loadError.value = 'Could not load this friend. Check your connection.'
    }
    console.error('Failed to load friend:', error)
  } finally {
    isLoading.value = false
  }
}

usePolling(load, () => (friend.value?.online ? ONLINE_POLL_MS : OFFLINE_POLL_MS))

const live = computed(() => friend.value?.live_workout ?? null)
const isStopped = computed(() => live.value?.finished_at != null)
const liveTime = computed(() =>
  live.value ? formatElapsed(liveWorkoutSeconds(live.value, now.value)) : '',
)

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function setsLabel(workout) {
  const count = workout.exercises.reduce((sum, exercise) => sum + exercise.sets_count, 0)
  return count === 1 ? '1 set' : `${count} sets`
}

function toggle(workout) {
  if (openWorkouts.value.has(workout.id)) openWorkouts.value.delete(workout.id)
  else openWorkouts.value.add(workout.id)
}

async function removeFriend() {
  isRemoving.value = true

  try {
    await api.delete(`/friends/${route.params.username}`)
    router.push('/friends')
  } catch (error) {
    console.error('Failed to remove friend:', error)
    isRemoveOpen.value = false
  } finally {
    isRemoving.value = false
  }
}
</script>

<template>
  <PageLayout :title="friend?.user.name ?? 'Friend'">
    <template #actions>
      <v-btn
        :icon="mdiArrowLeft"
        variant="text"
        aria-label="Back to friends"
        @click="router.push('/friends')"
      />
    </template>

    <SkeletonList v-if="isLoading" :rows="3" />
    <div v-else-if="!friend" class="empty">
      <p class="empty-text">{{ loadError }}</p>
      <BaseButton variant="secondary" @click="router.push('/friends')">Back to friends</BaseButton>
    </div>

    <template v-else>
      <div class="identity">
        <span class="ring" :class="{ on: friend.online, stopped: isStopped }">
          <Avatar :code="friend.user.avatar" :size="58" />
        </span>
        <span class="who">
          <span class="who-handle">@{{ friend.user.username }}</span>
          <span class="status" :class="{ online: friend.online }">
            {{ friend.online ? (isStopped ? 'Stopped for now' : 'At the gym') : 'Offline' }}
          </span>
        </span>
      </div>

      <section v-if="live" class="live" aria-label="Workout in progress">
        <div class="live-head">
          <span class="live-name">{{ live.name || 'Workout' }}</span>
          <span class="live-time" :class="{ stopped: isStopped }" aria-live="off">{{
            liveTime
          }}</span>
        </div>

        <p v-if="live.exercises.length === 0" class="quiet">No exercises logged yet.</p>
        <ul v-else class="exercises">
          <li v-for="exercise in live.exercises" :key="exercise.id" class="exercise">
            <span class="exercise-name">{{ exercise.name }}</span>
            <ul v-if="exercise.sets.length > 0" class="sets">
              <li v-for="set in exercise.sets" :key="set.id">{{ formatSet(set) }}</li>
            </ul>
            <span v-else class="quiet">No sets yet</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" class="section-title">History</h2>
        <p v-if="friend.history.length === 0" class="quiet">No other workouts yet.</p>

        <ul v-else class="history">
          <li v-for="workout in friend.history" :key="workout.id" class="history-row">
            <button
              type="button"
              class="history-toggle"
              :aria-expanded="openWorkouts.has(workout.id)"
              @click="toggle(workout)"
            >
              <span class="history-main">
                <span class="history-name">{{ workout.name || 'Workout' }}</span>
                <span class="history-meta">
                  {{ formatDate(workout.date) }}
                  <template v-if="workout.duration_minutes != null">
                    · {{ workout.duration_minutes }} min</template
                  >
                  · {{ setsLabel(workout) }}
                </span>
              </span>
              <v-icon
                :icon="mdiChevronDown"
                size="20"
                class="chevron"
                :class="{ open: openWorkouts.has(workout.id) }"
              />
            </button>

            <ul v-if="openWorkouts.has(workout.id)" class="exercises">
              <li v-for="exercise in workout.exercises" :key="exercise.id" class="exercise">
                <span class="exercise-name">{{ exercise.name }}</span>
                <ul class="sets">
                  <li v-for="set in exercise.sets" :key="set.id">{{ formatSet(set) }}</li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <v-btn variant="text" color="danger" class="remove" @click="isRemoveOpen = true"
        >Remove friend</v-btn
      >
    </template>

    <ConfirmDialog
      v-model="isRemoveOpen"
      title="Remove this friend?"
      message="You will stop seeing each other's workouts. You can send a new request later."
      confirm-label="Remove"
      :loading="isRemoving"
      @confirm="removeFriend"
    />
  </PageLayout>
</template>

<style scoped>
.identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ring {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 3px solid var(--color-divider);
}

.ring.on {
  border-color: var(--color-accent);
}

.ring.on.stopped {
  border-color: var(--color-text-faint);
}

.who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.who-handle {
  font-size: 15px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  font-size: 13px;
  color: var(--color-text-faint);
}

.status.online {
  color: var(--color-accent-blush);
}

.live {
  padding: 16px 18px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
}

.live-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.live-name {
  min-width: 0;
  font-size: 18px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-time {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
}

.live-time.stopped {
  color: var(--color-text-muted);
}

.exercises {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.exercise {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.exercise + .exercise {
  padding-top: 12px;
  border-top: 1px solid var(--color-divider);
}

.exercise-name {
  font-size: 15px;
  font-weight: 700;
}

.sets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sets li {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-surface-low);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}

.section-title {
  margin: 8px 0 12px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.history {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.history-row {
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
}

.history-row > .exercises {
  padding: 0 18px 16px;
}

.history-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 18px;
  border: 0;
  border-radius: var(--radius-card);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.history-toggle:hover {
  background: var(--color-surface-hover);
}

.history-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.history-name {
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.chevron {
  flex-shrink: 0;
  color: var(--color-text-faint);
  transition: transform 0.2s var(--ease-out);
}

.chevron.open {
  transform: rotate(180deg);
}

.quiet {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-subtle);
}

.empty {
  padding: 20px 22px;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
}

.empty-text {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--color-text-muted);
}

.remove {
  align-self: center;
  margin-top: 8px;
}
</style>
