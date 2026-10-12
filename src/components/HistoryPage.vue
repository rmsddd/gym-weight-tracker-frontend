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
    const [exerciseList, categoryList] = await Promise.all([
      catalogStore.getExercises(),
      catalogStore.getCategories(),
    ])
    exercises.value = exerciseList
    categories.value = categoryList
  } catch (error) {
    console.error('Failed to load filter options:', error)
  }
  await loadWorkouts()
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
