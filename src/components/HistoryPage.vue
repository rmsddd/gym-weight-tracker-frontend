<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mdiTune } from '@mdi/js'
import api from '../services/api'
import catalogStore from '../stores/catalog'
import PageLayout from './ui/PageLayout.vue'
import SkeletonList from './ui/SkeletonList.vue'

const route = useRoute()
const router = useRouter()

const workouts = ref([])
const exercises = ref([])
const categories = ref([])
const monthlyStats = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

// The filters live in the address (?from=…&category=…), so they survive opening a workout
// and coming back, and a filtered view can be bookmarked
const dateFromQuery = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : '')
const idFromQuery = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const from = ref(dateFromQuery(route.query.from))
const to = ref(dateFromQuery(route.query.to))
const categoryId = ref(idFromQuery(route.query.category))
const exerciseId = ref(idFromQuery(route.query.exercise))

// Narrowing by category also narrows the exercise picker
const exerciseOptions = computed(() =>
  categoryId.value
    ? exercises.value.filter((e) => e.category?.id === categoryId.value)
    : exercises.value,
)

const activeFilterCount = computed(
  () => [from.value, to.value, categoryId.value, exerciseId.value].filter(Boolean).length,
)
const hasFilters = computed(() => activeFilterCount.value > 0)

// Folded away by default so results start near the top of a phone screen
const filtersOpen = ref(hasFilters.value)

// Oldest month on the left, the current one on the right
const months = computed(() =>
  [...monthlyStats.value].reverse().map((stat) => {
    const [year, monthNumber] = stat.month.split('-').map(Number)
    const firstDay = new Date(year, monthNumber - 1, 1)
    const lastDay = new Date(year, monthNumber, 0).getDate()
    return {
      ...stat,
      from: `${stat.month}-01`,
      to: `${stat.month}-${String(lastDay).padStart(2, '0')}`,
      shortLabel: firstDay.toLocaleDateString('en-US', { month: 'short' }),
      label: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    }
  }),
)

// The busiest month fills the chart; the others are drawn relative to it
const busiestMonth = computed(() => Math.max(1, ...months.value.map((month) => month.workouts_count)))

// A month is selected when the date filters cover exactly that month
const selectedMonth = computed(() =>
  months.value.find((month) => month.from === from.value && month.to === to.value),
)

function workoutsLabel(count) {
  return `${count} ${count === 1 ? 'workout' : 'workouts'}`
}

function formatMinutes(total) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`
}

function toggleMonth(month) {
  const isSelected = selectedMonth.value?.month === month.month
  from.value = isSelected ? '' : month.from
  to.value = isSelected ? '' : month.to
}

function syncQuery() {
  const query = {}
  if (from.value) query.from = from.value
  if (to.value) query.to = to.value
  if (categoryId.value) query.category = categoryId.value
  if (exerciseId.value) query.exercise = exerciseId.value
  router.replace({ query })
}

async function loadWorkouts() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await api.get('/workouts', {
      params: {
        finished: 1,
        include: 'exercises',
        from: from.value || undefined,
        to: to.value || undefined,
        category_id: categoryId.value || undefined,
        exercise_id: exerciseId.value || undefined,
      },
    })
    workouts.value = response.data.data ?? response.data
  } catch (error) {
    errorMessage.value = 'Could not load your history.'
    console.error('Failed to load history:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  try {
    const [exerciseList, deletedList, categoryList] = await Promise.all([
      catalogStore.getExercises(),
      // Optional: the filter still works with the current exercises if this one fails
      catalogStore.getDeletedExercises().catch(() => []),
      catalogStore.getCategories(),
    ])
    // Deleted exercises stay in the workouts that logged them, so their history can still be filtered
    exercises.value = [...exerciseList, ...deletedList.map((e) => ({ ...e, name: `${e.name} (deleted)` }))]
      .sort((a, b) => a.name.localeCompare(b.name))
    categories.value = categoryList
  } catch (error) {
    console.error('Failed to load filter options:', error)
  }
  await loadWorkouts()
})

onMounted(async () => {
  try {
    const response = await api.get('/monthly-stats')
    monthlyStats.value = response.data.data ?? response.data
  } catch (error) {
    // The list below still works without the chart
    console.error('Failed to load monthly stats:', error)
  }
})

watch(categoryId, () => {
  if (exerciseId.value && !exerciseOptions.value.some((e) => e.id === exerciseId.value)) {
    exerciseId.value = null
  }
})

watch([from, to, categoryId, exerciseId], () => {
  syncQuery()
  loadWorkouts()
})

function clearFilters() {
  from.value = ''
  to.value = ''
  categoryId.value = null
  exerciseId.value = null
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function totalVolume(workout) {
  return Math.round(workout.exercises.reduce((sum, e) => sum + e.volume, 0))
}

// Minutes logged on timed exercises (plank, cardio), which have no volume
function timedMinutes(workout) {
  return Math.round(workout.exercises.reduce((sum, e) => sum + (e.minutes ?? 0), 0) * 10) / 10
}

function totalSets(workout) {
  return workout.exercises.reduce((sum, e) => sum + e.sets_count, 0)
}
</script>

<template>
  <PageLayout title="History">
    <v-card v-if="months.length > 0" color="surface" class="months">
      <div class="months-head">
        <h2 class="months-title">Workouts per month</h2>
        <p class="months-summary" aria-live="polite">
          <template v-if="selectedMonth">
            {{ selectedMonth.label }} · {{ workoutsLabel(selectedMonth.workouts_count) }}
            <template v-if="selectedMonth.total_minutes > 0"> · {{ formatMinutes(selectedMonth.total_minutes) }}</template>
          </template>
          <template v-else>Tap a month to see its workouts</template>
        </p>
      </div>

      <div class="months-chart">
        <button
          v-for="month in months"
          :key="month.month"
          type="button"
          class="month"
          :class="{ selected: selectedMonth?.month === month.month, dimmed: selectedMonth && selectedMonth.month !== month.month }"
          :aria-pressed="selectedMonth?.month === month.month"
          :aria-label="`${month.label}: ${workoutsLabel(month.workouts_count)}`"
          @click="toggleMonth(month)"
        >
          <span class="month-count">{{ month.workouts_count || '' }}</span>
          <span class="month-track">
            <span class="month-fill" :style="{ height: `${(month.workouts_count / busiestMonth) * 100}%` }"></span>
          </span>
          <span class="month-label">{{ month.shortLabel }}</span>
        </button>
      </div>
    </v-card>

    <div class="filter-bar">
      <v-btn
        variant="outlined"
        size="small"
        :prepend-icon="mdiTune"
        :aria-expanded="filtersOpen"
        aria-controls="history-filters"
        @click="filtersOpen = !filtersOpen"
      >
        Filters
        <span v-if="hasFilters" class="filter-count">{{ activeFilterCount }}</span>
      </v-btn>
      <v-btn v-if="hasFilters" variant="text" size="small" @click="clearFilters">Clear filters</v-btn>
    </div>

    <section v-show="filtersOpen" id="history-filters" class="filters" aria-label="Filters">
      <div class="date-filters">
        <v-text-field v-model="from" type="date" label="From" name="from" autocomplete="off" density="compact" hide-details />
        <v-text-field v-model="to" type="date" label="To" name="to" autocomplete="off" density="compact" hide-details />
      </div>
      <v-select
        v-model="categoryId"
        :items="categories"
        item-title="name"
        item-value="id"
        label="Category"
        clearable
        density="compact"
        hide-details
      />
      <v-select
        v-model="exerciseId"
        :items="exerciseOptions"
        item-title="name"
        item-value="id"
        label="Exercise"
        clearable
        density="compact"
        hide-details
      />
    </section>

    <SkeletonList v-if="isLoading" />
    <p v-else-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="workouts.length === 0" class="muted">
      {{ hasFilters ? 'No finished workouts match these filters.' : 'No finished workouts yet.' }}
    </p>

    <div v-else class="history-list">
      <v-card
        v-for="workout in workouts"
        :key="workout.id"
        color="surface"
        class="history-row pressable"
        :to="`/workouts/${workout.id}`"
        :ripple="false"
      >
        <div class="row-top">
          <p class="history-name">{{ workout.name || 'Workout' }}</p>
          <p class="history-date">{{ formatDate(workout.date) }}</p>
        </div>
        <p class="history-meta">
          <template v-if="workout.duration_minutes != null">{{ workout.duration_minutes }} min · </template>
          {{ totalSets(workout) }} sets
          <template v-if="totalVolume(workout) > 0 || timedMinutes(workout) === 0"> · {{ totalVolume(workout) }} kg volume</template>
          <template v-if="timedMinutes(workout) > 0"> · {{ timedMinutes(workout) }} min timed</template>
        </p>
        <ul v-if="workout.exercises.length > 0" class="chips">
          <li v-for="(exercise, index) in workout.exercises" :key="index">{{ exercise.name }}</li>
        </ul>
      </v-card>
    </div>
  </PageLayout>
</template>

<style scoped>
.months {
  padding: 16px 18px;
}

.months-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 12px;
  margin-bottom: 12px;
}

.months-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.months-summary {
  margin: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.months-chart {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 4px;
}

.month {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 4px 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}

.month:hover,
.month.selected {
  background: var(--color-surface-hover);
}

.month:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.month.dimmed {
  opacity: 0.45;
}

.month-count {
  height: 16px;
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}

.month-track {
  display: flex;
  align-items: flex-end;
  width: 60%;
  max-width: 22px;
  height: 56px;
  border-radius: 4px;
  background: var(--color-surface-low);
  overflow: hidden;
}

.month-fill {
  width: 100%;
  border-radius: 4px;
  background: var(--color-accent);
}

.month-label {
  font-size: 11px;
  color: var(--color-text-muted);
}

.month.selected .month-label {
  color: var(--color-text-primary);
  font-weight: 700;
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.date-filters {
  display: flex;
  gap: 10px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-count {
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--color-accent-deep);
  color: var(--color-text-primary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.muted {
  margin: 0;
  color: var(--color-text-subtle);
  font-size: 14px;
}

.error {
  margin: 0;
  color: var(--color-danger-text);
  font-size: 14px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-row {
  padding: 16px 18px;
  color: inherit;
}

.history-row:hover {
  background: var(--color-surface-hover);
}

.row-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.history-name {
  margin: 0;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-date {
  margin: 0;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.history-meta {
  margin: 4px 0 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.chips li {
  padding: 2px 10px;
  border: 1px solid var(--color-divider);
  border-radius: 999px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
