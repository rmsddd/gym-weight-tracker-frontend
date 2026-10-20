<script setup>
import { computed, ref } from 'vue'
import { mdiChevronLeft, mdiChevronRight } from '@mdi/js'

const props = defineProps({
  // Past workouts only: one still running does not colour its day until it is stopped
  workouts: { type: Array, required: true },
})

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const today = new Date()
const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate())

// The first of the month on show; starts on the current one every time the dashboard opens
const shown = ref(new Date(today.getFullYear(), today.getMonth(), 1))

const isCurrentMonth = computed(
  () =>
    shown.value.getFullYear() === today.getFullYear() &&
    shown.value.getMonth() === today.getMonth(),
)

const heading = computed(() =>
  shown.value.toLocaleDateString('en-US', {
    month: 'long',
    year: shown.value.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }),
)

function dayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// The API sends the date as midnight UTC; its first ten characters are the day it was logged for
const workoutsByDay = computed(() => {
  const groups = new Map()
  for (const workout of props.workouts) {
    const key = String(workout.date).slice(0, 10)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(workout)
  }
  return groups
})

// Blank squares before the 1st (weeks start on Monday) and after the last day, to fill the grid
const cells = computed(() => {
  const year = shown.value.getFullYear()
  const month = shown.value.getMonth()
  const leading = (new Date(year, month, 1).getDay() + 6) % 7
  const length = new Date(year, month + 1, 0).getDate()

  const list = Array.from({ length: leading }, (_, i) => ({ key: `lead-${i}` }))
  for (let day = 1; day <= length; day++) {
    const key = dayKey(year, month, day)
    list.push({ key, day, workouts: workoutsByDay.value.get(key) ?? [], isToday: key === todayKey })
  }
  while (list.length % 7 !== 0) list.push({ key: `trail-${list.length}` })
  return list
})

function moveMonth(step) {
  if (step > 0 && isCurrentMonth.value) return
  shown.value = new Date(shown.value.getFullYear(), shown.value.getMonth() + step, 1)
}

const nameOf = (workout) => workout.name || 'Workout'

function label(cell) {
  return cell.workouts.length === 1 ? nameOf(cell.workouts[0]) : `${cell.workouts.length} workouts`
}

// A day with several workouts shows one name per line: the first two, or the first and "+N more"
function lines(cell) {
  const [first, second] = cell.workouts
  const rest = cell.workouts.length - 1
  return [nameOf(first), rest === 1 ? nameOf(second) : `+${rest} more`]
}

function ariaLabel(cell) {
  const date = new Date(shown.value.getFullYear(), shown.value.getMonth(), cell.day)
  const names = cell.workouts.map(nameOf).join(', ')
  return `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}, ${names}`
}
</script>

<template>
  <section class="calendar" aria-label="Workouts by month">
    <header class="calendar-head">
      <div class="month-nav">
        <v-btn
          :icon="mdiChevronLeft"
          variant="text"
          size="small"
          color="secondary"
          aria-label="Previous month"
          @click="moveMonth(-1)"
        />
        <h2 class="month-name" aria-live="polite">{{ heading }}</h2>
        <v-btn
          :icon="mdiChevronRight"
          variant="text"
          size="small"
          color="secondary"
          aria-label="Next month"
          :disabled="isCurrentMonth"
          @click="moveMonth(1)"
        />
      </div>
      <RouterLink to="/history" class="history-link">History ›</RouterLink>
    </header>

    <div class="panel">
      <div class="weekdays" aria-hidden="true">
        <span v-for="(weekday, index) in WEEKDAYS" :key="index">{{ weekday }}</span>
      </div>

      <div class="grid">
        <template v-for="cell in cells" :key="cell.key">
          <span v-if="!cell.day" class="day blank"></span>

          <RouterLink
            v-else-if="cell.workouts.length === 1"
            :to="`/workouts/${cell.workouts[0].id}`"
            class="day trained"
            :class="{ today: cell.isToday }"
            :aria-label="ariaLabel(cell)"
          >
            <em class="day-label" aria-hidden="true">{{ label(cell) }}</em>
            <span aria-hidden="true">{{ cell.day }}</span>
          </RouterLink>

          <v-menu v-else-if="cell.workouts.length > 1" location="bottom start">
            <template #activator="{ props: menuProps }">
              <button
                v-bind="menuProps"
                type="button"
                class="day trained"
                :class="{ today: cell.isToday }"
                :aria-label="ariaLabel(cell)"
              >
                <span class="day-label day-lines" aria-hidden="true">
                  <em v-for="(line, index) in lines(cell)" :key="index">{{ line }}</em>
                </span>
                <span aria-hidden="true">{{ cell.day }}</span>
              </button>
            </template>

            <v-list bg-color="surface-bright" class="day-menu" density="comfortable">
              <v-list-item
                v-for="workout in cell.workouts"
                :key="workout.id"
                :to="`/workouts/${workout.id}`"
                :title="workout.name || 'Workout'"
              />
            </v-list>
          </v-menu>

          <span v-else class="day" :class="{ today: cell.isToday }">{{ cell.day }}</span>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.calendar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: -8px;
}

.month-name {
  min-width: 7.5em;
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  text-align: center;
}

.history-link {
  padding: 6px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.2s var(--ease-out);
}

.history-link:hover {
  color: var(--color-text-primary);
}

.panel {
  padding: 18px;
  background: var(--color-surface-low);
  border-radius: 18px;
}

.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.weekdays {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  color: var(--color-text-muted);
}

.day {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  aspect-ratio: 1;
  padding: 4px 7px;
  border: 0;
  border-radius: 9px;
  background: var(--color-surface-hover);
  font: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-faint);
  text-decoration: none;
  box-sizing: border-box;
}

.day.blank {
  background: transparent;
}

.day.trained {
  background: var(--color-accent);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s var(--ease-out);
}

.day.trained:hover {
  background: var(--color-accent-deep);
}

.day.today {
  outline: 1.5px solid var(--color-accent-blush);
  outline-offset: -1.5px;
}

.day.today:not(.trained) {
  background: transparent;
  color: var(--color-accent-blush);
}

.day-label {
  position: absolute;
  top: 5px;
  left: 6px;
  right: 5px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-style: normal;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.15;
  text-align: left;
  color: rgba(255, 255, 255, 0.72);
  overflow-wrap: anywhere;
}

/* One line per workout, each cut short rather than wrapped */
.day-lines {
  display: flex;
  flex-direction: column;
}

.day-lines em {
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day-menu {
  min-width: 180px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-menu);
}
</style>
