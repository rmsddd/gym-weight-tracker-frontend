<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { elapsedSecondsBetween, formatElapsed } from '../utils/formatElapsed'
import authStore from '../stores/auth'
import { mdiDeleteOutline } from '@mdi/js'
import AmbientBackground from './ui/AmbientBackground.vue'
import AppMenu from './ui/AppMenu.vue'
import Avatar from './ui/Avatar.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import SkeletonList from './ui/SkeletonList.vue'

const RECENT_LIMIT = 5

const router = useRouter()

const workouts = ref([])
const isLoading = ref(true)
const workoutToDelete = ref(null)
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const now = ref(Date.now())
let timerId = null

onBeforeUnmount(() => clearInterval(timerId))

onMounted(async () => {
  try {
    const response = await api.get('/workouts')
    workouts.value = response.data.data ?? response.data
    if (workouts.value.some(isRunning)) {
      timerId = setInterval(() => (now.value = Date.now()), 1000)
    }
  } catch (error) {
    console.error('Failed to load workouts:', error)
  } finally {
    isLoading.value = false
  }
})

const sortedWorkouts = computed(() =>
  [...workouts.value].sort((a, b) => new Date(b.date) - new Date(a.date)),
)

// The workout being logged right now gets its own card; the list below is for past ones
const runningWorkouts = computed(() => sortedWorkouts.value.filter(isRunning))
const pastWorkouts = computed(() => sortedWorkouts.value.filter((workout) => !isRunning(workout)))
const recentWorkouts = computed(() => pastWorkouts.value.slice(0, RECENT_LIMIT))
const hasMore = computed(() => pastWorkouts.value.length > RECENT_LIMIT)

const last30DaysWorkouts = computed(() => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  return sortedWorkouts.value.filter((workout) => new Date(workout.date) >= cutoff)
})

const averageDuration = computed(() => {
  const withDuration = last30DaysWorkouts.value.filter((w) => w.duration_minutes != null)
  if (withDuration.length === 0) return null

  const total = withDuration.reduce((sum, w) => sum + Number(w.duration_minutes), 0)
  return Math.round(total / withDuration.length)
})

// The most recent day at the gym, the workout in progress included
const lastWorkout = computed(() => sortedWorkouts.value[0] ?? null)


function isRunning(workout) {
  return workout.started_at != null && workout.finished_at == null
}

function runningTime(workout) {
  return formatElapsed(elapsedSecondsBetween(workout.started_at, now.value))
}

const firstName = computed(() => authStore.state.user?.name?.split(' ')[0] ?? '')

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function askDelete(workout) {
  workoutToDelete.value = workout
  isDeleteOpen.value = true
}

async function confirmDelete() {
  isDeleting.value = true

  try {
    await api.delete(`/workouts/${workoutToDelete.value.id}`)
    workouts.value = workouts.value.filter((w) => w.id !== workoutToDelete.value.id)
    isDeleteOpen.value = false
  } catch (error) {
    console.error('Failed to delete workout:', error)
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="dashboard-page">
    <AmbientBackground />
    <main class="dashboard-content">
      <header class="dashboard-header">
        <RouterLink to="/profile" class="greeting-group" aria-label="Open your profile">
          <Avatar :code="authStore.state.user?.avatar" :size="44" />
          <h1 class="greeting">Hi, {{ firstName }}</h1>
        </RouterLink>

        <div class="header-actions">
          <BaseButton class="add-workout-button" @click="router.push('/workouts/new')">
            + New workout
          </BaseButton>

          <AppMenu />
        </div>
      </header>

      <section v-if="runningWorkouts.length > 0" class="continue-section" aria-label="Workout in progress">
        <RouterLink
          v-for="workout in runningWorkouts"
          :key="workout.id"
          :to="`/workouts/${workout.id}`"
          class="continue-card pressable"
        >
          <span class="continue-info">
            <span class="continue-label">In progress</span>
            <span class="continue-name">{{ workout.name || 'Workout' }}</span>
          </span>
          <span class="continue-time">{{ runningTime(workout) }}</span>
          <span class="continue-cta">Continue</span>
        </RouterLink>
      </section>

      <section class="stats-row">
        <v-card class="stat-card" color="surface">
          <p class="stat-label">Workouts (30 days)</p>
          <p class="stat-value">{{ last30DaysWorkouts.length }}</p>
        </v-card>

        <v-card class="stat-card" color="surface">
          <p class="stat-label">Last workout</p>
          <p class="stat-value">{{ lastWorkout ? formatDate(lastWorkout.date) : '—' }}</p>
        </v-card>

        <v-card class="stat-card" color="surface">
          <p class="stat-label">Average duration</p>
          <p class="stat-value accent">
            <template v-if="averageDuration != null">{{ averageDuration }}<span class="stat-unit">min</span></template>
            <template v-else>—</template>
          </p>
        </v-card>
      </section>

      <section class="recent-section">
        <h2 class="section-title">Recent workouts</h2>

        <SkeletonList v-if="isLoading" :rows="3" />
        <div v-else-if="sortedWorkouts.length === 0" class="empty-state">
          <Avatar :code="authStore.state.user?.avatar" :size="64" />
          <div class="empty-copy">
            <p class="empty-title">No workouts yet</p>
            <p class="empty-text">Start one and log your sets as you go. Your history and records build from there.</p>
            <BaseButton @click="router.push('/workouts/new')">Start your first workout</BaseButton>
          </div>
        </div>
        <p v-else-if="recentWorkouts.length === 0" class="quiet">Past workouts show up here once you stop one.</p>

        <template v-else>
          <ul class="workout-list">
            <li v-for="workout in recentWorkouts" :key="workout.id" class="workout-row pressable">
              <!-- The link stretches over the whole row; the delete button sits above it -->
              <RouterLink :to="`/workouts/${workout.id}`" class="row-link">
                <span class="workout-name">{{ workout.name || 'Workout' }}</span>
                <span class="workout-meta">
                  {{ formatDate(workout.date) }}
                  <template v-if="workout.duration_minutes != null"> · {{ workout.duration_minutes }} min</template>
                </span>
              </RouterLink>

              <div class="row-actions">
                <v-btn
                  :icon="mdiDeleteOutline"
                  variant="text"
                  size="small"
                  color="secondary"
                  :aria-label="`Delete ${workout.name || 'workout'}`"
                  @click="askDelete(workout)"
                />
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" class="chevron" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
            </li>
          </ul>

          <RouterLink v-if="hasMore" to="/history" class="see-all">See all workouts in History →</RouterLink>
        </template>
      </section>
    </main>

    <ConfirmDialog
      v-model="isDeleteOpen"
      title="Delete this workout?"
      message="The workout, its exercises and its sets will be permanently deleted."
      :loading="isDeleting"
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
.dashboard-page {
  position: relative;
  min-height: 100dvh;
  background: var(--color-night-floor);
  color: var(--color-text-primary);
  padding: var(--page-pad-top) var(--page-pad-right) var(--page-pad-bottom) var(--page-pad-left);
  box-sizing: border-box;
  overflow: hidden;
}

@media (min-width: 900px) {
  .dashboard-page {
    padding-top: 40px;
    padding-bottom: 60px;
  }
}

/* A readable column: wide enough for the three stats, narrow enough that a row's name and its
   actions stay close together on a desktop screen */
.dashboard-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.greeting-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  border-radius: var(--radius-card);
  color: inherit;
  text-decoration: none;
  transition: opacity 0.2s var(--ease-out);
}

.greeting-group:hover {
  opacity: 0.85;
}

.greeting {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 28px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.continue-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

/* One step up the plum scale from the stat cards, with the live timer as the only accent */
.continue-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
  color: var(--color-text-primary);
  text-decoration: none;
}

.continue-card:hover {
  background: var(--color-divider);
}

.continue-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.continue-label {
  font-size: 13px;
  color: var(--color-text-muted);
}

.continue-name {
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.continue-time {
  flex-shrink: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 24px;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
}

.continue-cta {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: var(--radius-button);
  background: var(--color-accent-deep);
  font-size: 14px;
  font-weight: 600;
}

/* Always three across, phone included: labels may wrap, values line up on the bottom edge */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
  padding: 14px;
  box-sizing: border-box;
}

.stat-label {
  margin: 0;
  font-size: 13px;
  line-height: 1.3;
  color: var(--color-text-muted);
}

.stat-unit {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
}

.stat-value {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}

.stat-value.accent {
  color: var(--color-accent);
}

.section-title {
  margin: 0 0 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.quiet {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-subtle);
}

.empty-state {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 22px;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
}

.empty-copy {
  min-width: 0;
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

.workout-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.workout-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
  padding: 16px 18px;
}

.workout-row:hover {
  background: var(--color-surface-hover);
}

.row-link {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.row-link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-card);
}

/* The ring goes around the whole row, not just the text */
.row-link:focus-visible {
  outline: none;
}

.row-link:focus-visible::after {
  outline: 2px solid var(--color-accent-blush);
  outline-offset: 2px;
}

.workout-name {
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workout-meta {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

/* Above the stretched link, but only the delete button takes clicks: a tap on the chevron
   or the gap still opens the workout */
.row-actions {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  pointer-events: none;
}

.row-actions > .v-btn {
  pointer-events: auto;
}

.chevron {
  color: var(--color-text-faint);
  flex-shrink: 0;
  pointer-events: none;
}

.see-all {
  display: inline-block;
  margin-top: 14px;
  padding: 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.2s var(--ease-out);
}

.see-all:hover {
  color: var(--color-text-primary);
}

@media (max-width: 420px) {
  .greeting {
    font-size: 24px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .add-workout-button {
    flex: 1;
  }

  .continue-card {
    flex-wrap: wrap;
  }

  .continue-cta {
    flex: 1 1 100%;
    text-align: center;
  }
}
</style>
