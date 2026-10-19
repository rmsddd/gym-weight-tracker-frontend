<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { elapsedSecondsBetween, formatElapsed } from '../utils/formatElapsed'
import { formatReps, formatSet } from '../utils/formatSet'
import { parseDecimal, parseReps, repsAsTyped } from '../utils/parseSet'
import { mdiArrowLeft, mdiClipboardListOutline, mdiClose, mdiDeleteOutline } from '@mdi/js'
import AmbientBackground from './ui/AmbientBackground.vue'
import Avatar from './ui/Avatar.vue'
import authStore from '../stores/auth'
import catalogStore from '../stores/catalog'
import BaseButton from './ui/BaseButton.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const workoutId = route.params.id

const workout = ref(null)
const workoutExercises = ref([])
const exercises = ref([])
const categories = ref([])
const now = ref(Date.now())
const search = ref('')
const errorMessage = ref('')
const isStopping = ref(false)
const isResuming = ref(false)
const isCompleteOpen = ref(false)
const isCompleting = ref(false)
const itemToDelete = ref(null)
const isItemDeleteOpen = ref(false)
const isDeletingItem = ref(false)
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const customToDelete = ref(null)
const isCustomDeleteOpen = ref(false)
const isDeletingCustom = ref(false)
const newExerciseCategoryId = ref('')
const newExerciseUnit = ref('kg')
const setInputs = ref({})
const setErrors = ref({})
const isRecordMoment = ref(false)
const previousSets = ref({})
const openCompoundIds = ref(new Set())
const isPickerOpen = ref(false)
const pickerError = ref('')
const isTemplateOpen = ref(false)
const templateName = ref('')
const isSavingTemplate = ref(false)
const templateSaved = ref(false)
let bests = {}
// Requests in flight, so a double tap cannot send the same thing twice
const savingSetFor = new Set()
const addingExerciseIds = new Set()
let timerId = null
let recordTimerId = null

// Opening a dialog should not pop the on-screen keyboard on a phone
const hasKeyboard = window.matchMedia('(pointer: fine)').matches

// Stopped (can be started again) or finished for good
const isFinished = computed(() => workout.value?.finished_at != null)
// Finished for good: it can no longer be started again
const isCompleted = computed(() => workout.value?.completed_at != null)

const statusLabel = computed(() => {
  if (isCompleted.value) return 'Finished'
  return isFinished.value ? 'Stopped' : 'In progress'
})

const elapsedSeconds = computed(() => {
  const end = isFinished.value ? new Date(workout.value.finished_at).getTime() : now.value
  return elapsedSecondsBetween(workout.value?.started_at, end)
})

const avatarExpression = computed(() => {
  if (isRecordMoment.value) return 'record'
  return isFinished.value ? 'normal' : 'focused'
})

const formattedTime = computed(() => formatElapsed(elapsedSeconds.value))

const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// The clear button of the search field sets the model to null
const searchTerm = computed(() => (search.value ?? '').trim())

const groupedExercises = computed(() => {
  const term = normalize(searchTerm.value)
  const groups = new Map()

  // Categories in their catalog order, the exercises of each alphabetically so they are easy to find
  const sorted = [...exercises.value].sort(
    (a, b) => (a.category?.id ?? Infinity) - (b.category?.id ?? Infinity) || a.name.localeCompare(b.name),
  )

  for (const exercise of sorted) {
    if (term && !normalize(exercise.name).includes(term)) continue
    const key = exercise.category?.name ?? 'Other'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(exercise)
  }

  return [...groups.entries()].map(([category, items]) => ({ category, items }))
})

const noResults = computed(() => searchTerm.value !== '' && groupedExercises.value.length === 0)

// Compound exercises: the muscle groups they work besides their own category, by exercise id
const secondaryMuscles = computed(
  () => new Map(exercises.value.map((e) => [e.id, (e.secondary_categories ?? []).map((c) => c.name)])),
)

function alsoWorks(workoutExercise) {
  return secondaryMuscles.value.get(workoutExercise.exercise?.id) ?? []
}

function toggleCompound(workoutExerciseId) {
  if (!openCompoundIds.value.delete(workoutExerciseId)) openCompoundIds.value.add(workoutExerciseId)
}

const addedExerciseIds = computed(() => new Set(workoutExercises.value.map((we) => we.exercise?.id)))

// Timed exercises (plank, cardio) log how long a set lasted instead of weight and reps
const isTimed = (workoutExercise) => workoutExercise.exercise?.unit === 'min'

const unitOptions = [
  { title: 'Weight × reps', value: 'kg' },
  { title: 'Minutes', value: 'min' },
]

// Cardio is measured in minutes, so picking that category for a new exercise picks the unit too
watch(newExerciseCategoryId, (id) => {
  const category = categories.value.find((c) => c.id === Number(id))
  newExerciseUnit.value = category?.name === 'Cardio' ? 'min' : 'kg'
})

function setError(message, error) {
  errorMessage.value = message
  console.error(message, error)
}

// Back to wherever the user came from (history, records, dashboard); the dashboard on a direct visit
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/dashboard')
}

async function loadAll() {
  try {
    const [workoutRes, weRes, exerciseList, categoryList] = await Promise.all([
      api.get(`/workouts/${workoutId}`),
      api.get(`/workouts/${workoutId}/exercises`),
      catalogStore.getExercises(),
      catalogStore.getCategories(),
    ])
    workout.value = workoutRes.data.data ?? workoutRes.data
    workoutExercises.value = weRes.data.data ?? weRes.data
    initInputs(workoutExercises.value)
    exercises.value = exerciseList
    categories.value = categoryList
  } catch (error) {
    setError('Could not load the workout.', error)
  }

  await Promise.all([loadBests(), loadPreviousSets()])
}

// What the user lifted the last time they did each exercise in this workout
async function loadPreviousSets() {
  try {
    const response = await api.get(`/workouts/${workoutId}/previous-sets`)
    previousSets.value = response.data.data ?? {}
  } catch (error) {
    console.error('Failed to load previous sets:', error)
  }
}

function lastTime(exerciseId) {
  const previous = previousSets.value[exerciseId]
  if (!previous) return null
  return {
    date: formatShortDate(previous.date),
    sets: previous.sets.map(formatSet).join(' · '),
  }
}

// The set the next "+ Set" most likely is: the matching one from last time, else a repeat of
// the set just logged, else last time's final set. Shown as the placeholders and used for any
// field left empty, so repeating a set is a single tap.
function suggestedSet(workoutExercise) {
  const previous = previousSets.value[workoutExercise.exercise.id]?.sets
  const match = previous?.[workoutExercise.sets.length] ?? workoutExercise.sets.at(-1) ?? previous?.at(-1)
  if (!match) return null

  // A set logged before the exercise changed its unit has nothing to suggest
  if (isTimed(workoutExercise)) {
    return match.duration_minutes != null ? { duration: Number(match.duration_minutes) } : null
  }
  return match.weight != null
    ? { weight: Number(match.weight), reps: Number(match.reps), reps_max: match.reps_max ?? null }
    : null
}

function setPlaceholder(workoutExercise, field) {
  const suggestion = suggestedSet(workoutExercise)
  if (!suggestion) return ''
  return field === 'reps' ? formatReps(suggestion) : String(suggestion[field])
}

function formatShortDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function openTemplateDialog() {
  templateName.value = workout.value?.name ?? ''
  isTemplateOpen.value = true
}

async function saveTemplate() {
  if (!templateName.value.trim()) return
  isSavingTemplate.value = true

  try {
    await api.post(`/workouts/${workoutId}/template`, { name: templateName.value.trim() })
    isTemplateOpen.value = false
    templateSaved.value = true
  } catch (error) {
    isTemplateOpen.value = false
    setError('Could not save the template.', error)
  } finally {
    isSavingTemplate.value = false
  }
}

// Best set per exercise so far, used to spot a new personal record while logging
async function loadBests() {
  try {
    const response = await api.get('/personal-records')
    const records = response.data.data ?? response.data
    bests = Object.fromEntries(
      records.map((r) => [r.exercise.id, { weight: r.weight, reps: r.reps, duration: r.duration_minutes }]),
    )
  } catch (error) {
    console.error('Failed to load personal records:', error)
  }
}

// `set` is { duration } for a timed exercise, { weight, reps } otherwise
function beatsBest(exerciseId, set) {
  const best = bests[exerciseId]
  if (!best) return false
  if (set.duration != null) return set.duration > (best.duration ?? 0)
  return set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)
}

function celebrateRecord() {
  isRecordMoment.value = true
  clearTimeout(recordTimerId)
  recordTimerId = setTimeout(() => (isRecordMoment.value = false), 4000)
}

async function stopWorkout() {
  errorMessage.value = ''
  isStopping.value = true

  try {
    const response = await api.post(`/workouts/${workoutId}/finish`)
    workout.value = response.data.data ?? response.data
    clearInterval(timerId)
  } catch (error) {
    setError('Could not stop the workout.', error)
  } finally {
    isStopping.value = false
  }
}

// Undo an accidental stop: the workout goes back to running and the timer keeps counting
async function resumeWorkout() {
  errorMessage.value = ''
  isResuming.value = true

  try {
    const response = await api.post(`/workouts/${workoutId}/resume`)
    workout.value = response.data.data ?? response.data
    now.value = Date.now()
    clearInterval(timerId)
    timerId = setInterval(() => (now.value = Date.now()), 1000)
  } catch (error) {
    setError('Could not start the workout again.', error)
  } finally {
    isResuming.value = false
  }
}

async function completeWorkout() {
  errorMessage.value = ''
  isCompleting.value = true

  try {
    const response = await api.post(`/workouts/${workoutId}/complete`)
    workout.value = response.data.data ?? response.data
    clearInterval(timerId)
  } catch (error) {
    setError('Could not finish the workout.', error)
  } finally {
    isCompleting.value = false
    isCompleteOpen.value = false
  }
}

function askRemoveExercise(workoutExercise) {
  itemToDelete.value = { type: 'exercise', workoutExercise }
  isItemDeleteOpen.value = true
}

function askRemoveSet(workoutExercise, set) {
  itemToDelete.value = { type: 'set', workoutExercise, set }
  isItemDeleteOpen.value = true
}

async function confirmRemoveItem() {
  const { type, workoutExercise, set } = itemToDelete.value
  isDeletingItem.value = true

  try {
    if (type === 'exercise') await removeExercise(workoutExercise)
    else await removeSet(workoutExercise, set)
  } finally {
    isDeletingItem.value = false
    isItemDeleteOpen.value = false
  }
}

const itemDeleteTitle = computed(() =>
  itemToDelete.value?.type === 'exercise' ? 'Delete this exercise?' : 'Delete this set?',
)

const itemDeleteMessage = computed(() =>
  itemToDelete.value?.type === 'exercise'
    ? `"${itemToDelete.value.workoutExercise.exercise?.name}" and all its sets will be permanently deleted.`
    : 'This set will be permanently deleted.',
)

async function deleteWorkout() {
  isDeleting.value = true

  try {
    await api.delete(`/workouts/${workoutId}`)
    router.push('/dashboard')
  } catch (error) {
    isDeleteOpen.value = false
    setError('Could not delete the workout.', error)
  } finally {
    isDeleting.value = false
  }
}

function openPicker() {
  pickerError.value = ''
  search.value = ''
  isPickerOpen.value = true
}

// The picker stays open after an add, so several exercises can be added in a row
async function addExercise(exerciseId) {
  if (addingExerciseIds.has(exerciseId)) return
  addingExerciseIds.add(exerciseId)
  pickerError.value = ''

  try {
    const response = await api.post(`/workouts/${workoutId}/exercises`, { exercise_id: exerciseId })
    const added = response.data.data ?? response.data
    initInputs([added])
    workoutExercises.value.push(added)
    search.value = ''
    loadPreviousSets()
  } catch (error) {
    pickerError.value = 'Could not add the exercise. Try again.'
    console.error('Failed to add exercise:', error)
  } finally {
    addingExerciseIds.delete(exerciseId)
  }
}

async function createExercise() {
  pickerError.value = ''
  if (!newExerciseCategoryId.value) {
    pickerError.value = 'Choose a category for the new exercise.'
    return
  }

  try {
    const response = await api.post('/exercises', {
      name: searchTerm.value,
      category_id: Number(newExerciseCategoryId.value),
      unit: newExerciseUnit.value,
    })
    const created = response.data.data ?? response.data
    exercises.value.push(created)
    catalogStore.addExercise(created)
    await addExercise(created.id)
  } catch (error) {
    pickerError.value = 'Could not create the exercise. Try again.'
    console.error('Failed to create exercise:', error)
  }
}

// Only the exercises the user created can be deleted; the shared catalog stays as it is
function askDeleteCustom(exercise) {
  customToDelete.value = exercise
  isCustomDeleteOpen.value = true
}

const customDeleteMessage = computed(
  () =>
    `"${customToDelete.value?.name}" will no longer be offered here, in your templates or in your records. The workouts you already logged it in keep it, sets included.`,
)

async function deleteCustomExercise() {
  const exercise = customToDelete.value
  isDeletingCustom.value = true
  pickerError.value = ''

  try {
    await api.delete(`/exercises/${exercise.id}`)
    exercises.value = exercises.value.filter((e) => e.id !== exercise.id)
    catalogStore.removeExercise(exercise.id)
  } catch (error) {
    pickerError.value = 'Could not delete the exercise. Try again.'
    console.error('Failed to delete exercise:', error)
  } finally {
    isDeletingCustom.value = false
    isCustomDeleteOpen.value = false
  }
}

async function removeExercise(workoutExercise) {
  try {
    await api.delete(`/workouts/${workoutId}/exercises/${workoutExercise.id}`)
    workoutExercises.value = workoutExercises.value.filter((we) => we.id !== workoutExercise.id)
  } catch (error) {
    setError('Could not delete the exercise.', error)
  }
}

const isBlank = (value) => value === '' || value == null

async function addSet(workoutExercise) {
  // A double tap must not log the same set twice
  if (savingSetFor.has(workoutExercise.id)) return

  const input = setInputs.value[workoutExercise.id] ?? {}
  const suggestion = suggestedSet(workoutExercise)
  let logged

  if (isTimed(workoutExercise)) {
    const duration = isBlank(input.duration) ? suggestion?.duration : parseDecimal(input.duration)

    if (duration == null || Number.isNaN(duration) || duration <= 0) {
      setErrors.value[workoutExercise.id] = 'Enter the minutes.'
      return
    }
    logged = { duration }
  } else {
    const weight = isBlank(input.weight) ? suggestion?.weight : parseDecimal(input.weight)
    // Reps can be a range ("9-10") when the last one was a struggle
    const reps = isBlank(input.reps) ? suggestion : parseReps(input.reps)

    const hasWeight = weight != null && !Number.isNaN(weight)

    if (!hasWeight || reps == null) {
      setErrors.value[workoutExercise.id] =
        !hasWeight && reps == null
          ? 'Enter the weight and the reps.'
          : hasWeight
            ? 'Enter the reps as a number or a range, like 9-10.'
            : 'Enter the weight as a number, like 62.5.'
      return
    }
    logged = { weight, reps: reps.reps, reps_max: reps.reps_max }
  }
  setErrors.value[workoutExercise.id] = ''
  savingSetFor.add(workoutExercise.id)

  try {
    const response = await api.post(
      `/workouts/${workoutId}/exercises/${workoutExercise.id}/sets`,
      logged.duration != null ? { duration_minutes: logged.duration } : logged,
    )
    workoutExercise.sets.push(response.data.data ?? response.data)

    const exerciseId = workoutExercise.exercise.id
    if (beatsBest(exerciseId, logged)) celebrateRecord()
    if (!bests[exerciseId] || beatsBest(exerciseId, logged)) bests[exerciseId] = logged
    setInputs.value[workoutExercise.id] = { weight: input.weight ?? '', reps: '', duration: '' }
  } catch (error) {
    setErrors.value[workoutExercise.id] = 'Could not save the set. Try again.'
    console.error('Failed to save set:', error)
  } finally {
    savingSetFor.delete(workoutExercise.id)
  }
}

async function removeSet(workoutExercise, set) {
  try {
    await api.delete(`/workouts/${workoutId}/exercises/${workoutExercise.id}/sets/${set.id}`)
    workoutExercise.sets = workoutExercise.sets.filter((s) => s.id !== set.id)
  } catch (error) {
    setError('Could not delete the set.', error)
  }
}

function initInputs(list) {
  for (const we of list) {
    setInputs.value[we.id] ??= { weight: '', reps: '', duration: '' }
  }
}

onMounted(async () => {
  await loadAll()
  if (workout.value && !isFinished.value) {
    timerId = setInterval(() => (now.value = Date.now()), 1000)
  }
})

onBeforeUnmount(() => {
  clearInterval(timerId)
  clearTimeout(recordTimerId)
})
</script>

<template>
  <div class="page">
    <AmbientBackground />
    <main class="container">
      <header class="topbar">
        <button type="button" class="back" @click="goBack"><v-icon :icon="mdiArrowLeft" size="18" />Back</button>

        <v-btn
          v-if="workout"
          class="delete-workout"
          :prepend-icon="mdiDeleteOutline"
          variant="outlined"
          size="small"
          color="error"
          aria-label="Delete workout"
          @click="isDeleteOpen = true"
        >
          Delete
        </v-btn>
      </header>

      <!-- Stays in view while scrolling, so the timer and Stop are always one tap away -->
      <section v-if="workout" class="timer-bar" aria-label="Workout timer">
        <Avatar :code="authStore.state.user?.avatar" :size="44" :expression="avatarExpression" />

        <div class="timer-info">
          <h1 class="title">{{ workout.name || 'Workout' }}</h1>
          <p class="time" :class="{ done: isFinished }">
            <span class="sr-only">{{ statusLabel }}, </span>{{ formattedTime }}
          </p>
        </div>

        <div v-if="!isCompleted" class="timer-actions">
          <BaseButton v-if="isFinished" :disabled="isResuming" @click="resumeWorkout">Start</BaseButton>
          <BaseButton v-else variant="danger" :disabled="isStopping" @click="stopWorkout">Stop</BaseButton>
          <BaseButton variant="secondary" @click="isCompleteOpen = true">Finish</BaseButton>
        </div>
        <p v-else class="finished-tag">Finished</p>
      </section>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

      <v-card v-if="workout" class="card" color="surface-bright" border>
        <header class="card-head">
          <h2 class="section-title">Exercises</h2>
          <!-- A quiet text button: it belongs to the list, but is not needed while logging sets -->
          <v-btn
            v-if="workoutExercises.length > 0"
            class="save-template"
            :prepend-icon="mdiClipboardListOutline"
            variant="text"
            size="small"
            :disabled="templateSaved"
            @click="openTemplateDialog"
          >
            {{ templateSaved ? 'Template saved' : 'Save as template' }}
          </v-btn>
        </header>

        <p v-if="workoutExercises.length === 0" class="muted empty">
          {{ isFinished ? 'No exercises were logged.' : 'No exercises yet. Add the first one to start logging sets.' }}
        </p>

        <div v-for="we in workoutExercises" :key="we.id" class="exercise-block">
          <div class="exercise-head">
            <div class="exercise-info">
              <p class="exercise-name">
                {{ we.exercise?.name }}
                <button
                  v-if="alsoWorks(we).length > 0"
                  type="button"
                  class="compound-btn"
                  aria-label="Compound exercise: show the other muscle groups it works"
                  :aria-expanded="openCompoundIds.has(we.id)"
                  @click="toggleCompound(we.id)"
                >
                  C
                </button>
              </p>
              <p class="muted small">
                {{ we.exercise?.category?.name
                }}<template v-if="openCompoundIds.has(we.id)"> · also {{ alsoWorks(we).join(', ') }}</template>
              </p>
              <p v-if="lastTime(we.exercise.id)" class="last-time">
                <span class="last-time-label">Last time · {{ lastTime(we.exercise.id).date }}</span>
                {{ lastTime(we.exercise.id).sets }}
              </p>
            </div>
            <button
              v-if="!isFinished"
              type="button"
              class="icon-btn"
              aria-label="Delete exercise"
              @click="askRemoveExercise(we)"
            >
              <v-icon :icon="mdiClose" size="18" />
            </button>
          </div>

          <ul v-if="we.sets.length > 0" class="sets">
            <li v-for="(set, index) in we.sets" :key="set.id">
              <span class="set-number">Set {{ index + 1 }}</span>
              <span>{{ formatSet(set) }}</span>
              <button
                v-if="!isFinished"
                type="button"
                class="icon-btn"
                aria-label="Delete set"
                @click="askRemoveSet(we, set)"
              >
                <v-icon :icon="mdiClose" size="18" />
              </button>
            </li>
          </ul>

          <form v-if="!isFinished" class="set-form" novalidate @submit.prevent="addSet(we)">
            <v-text-field
              v-if="isTimed(we)"
              v-model="setInputs[we.id].duration"
              inputmode="decimal"
              suffix="min"
              persistent-placeholder
              aria-label="Duration in minutes"
              autocomplete="off"
              :name="`duration-${we.id}`"
              :placeholder="setPlaceholder(we, 'duration')"
              density="compact"
              hide-details
            />
            <!-- Text fields, not number ones: a number field drops "62,5" and "9-10" -->
            <template v-else>
              <v-text-field
                v-model="setInputs[we.id].weight"
                inputmode="decimal"
                suffix="kg"
                persistent-placeholder
                aria-label="Weight in kg"
                autocomplete="off"
                :name="`weight-${we.id}`"
                :placeholder="setPlaceholder(we, 'weight')"
                density="compact"
                hide-details
              />
              <v-text-field
                :model-value="setInputs[we.id].reps"
                inputmode="decimal"
                suffix="reps"
                @update:model-value="setInputs[we.id].reps = repsAsTyped($event)"
                persistent-placeholder
                aria-label="Reps"
                autocomplete="off"
                :name="`reps-${we.id}`"
                :placeholder="setPlaceholder(we, 'reps')"
                density="compact"
                hide-details
              />
            </template>
            <BaseButton type="submit" size="sm" class="add-set">+ Set</BaseButton>
          </form>
          <p v-if="setErrors[we.id]" class="error set-error" role="alert">{{ setErrors[we.id] }}</p>
        </div>

        <BaseButton
          v-if="!isFinished"
          :variant="workoutExercises.length === 0 ? 'primary' : 'secondary'"
          block
          class="add-exercise"
          @click="openPicker"
        >
          + Add exercise
        </BaseButton>
      </v-card>
    </main>

    <v-dialog v-model="isPickerOpen" max-width="520" scrollable>
      <v-card color="surface-bright" border class="picker-dialog">
        <div class="picker-head">
          <h2 class="dialog-title">Add exercise</h2>
          <v-btn variant="text" size="small" @click="isPickerOpen = false">Done</v-btn>
        </div>

        <v-text-field
          v-model="search"
          placeholder="Search exercises…"
          aria-label="Search exercises"
          autocomplete="off"
          name="exercise-search"
          clearable
          density="compact"
          hide-details
        />

        <p v-if="pickerError" class="error" role="alert">{{ pickerError }}</p>

        <div class="picker-body">
          <div v-if="noResults" class="create-box">
            <p class="muted">No results for “{{ searchTerm }}”.</p>
            <v-select
              v-model="newExerciseCategoryId"
              :items="categories"
              item-title="name"
              item-value="id"
              placeholder="Choose a category"
              aria-label="Category for the new exercise"
              density="compact"
              hide-details
            />
            <v-select
              v-model="newExerciseUnit"
              :items="unitOptions"
              aria-label="How the new exercise is measured"
              density="compact"
              hide-details
            />
            <BaseButton size="sm" @click="createExercise">Create “{{ searchTerm }}”</BaseButton>
          </div>

          <details v-for="group in groupedExercises" :key="group.category" class="group" :open="searchTerm !== ''">
            <summary>
              {{ group.category }} <span class="muted small">({{ group.items.length }})</span>
            </summary>
            <ul class="picker">
              <li v-for="exercise in group.items" :key="exercise.id">
                <span class="picker-name">
                  {{ exercise.name }}
                  <span v-if="addedExerciseIds.has(exercise.id)" class="added">Added</span>
                </span>
                <span class="picker-actions">
                  <button
                    v-if="exercise.is_custom"
                    type="button"
                    class="icon-btn"
                    :aria-label="`Delete ${exercise.name}`"
                    @click="askDeleteCustom(exercise)"
                  >
                    <v-icon :icon="mdiDeleteOutline" size="18" />
                  </button>
                  <BaseButton size="sm" :variant="addedExerciseIds.has(exercise.id) ? 'secondary' : 'primary'" @click="addExercise(exercise.id)">
                    Add
                  </BaseButton>
                </span>
              </li>
            </ul>
          </details>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="isTemplateOpen" max-width="360" :persistent="isSavingTemplate">
      <v-card color="surface-bright" border class="template-dialog">
        <h2 class="dialog-title">Save as template</h2>
        <p class="muted small template-hint">
          The exercises from this workout will be added automatically when you start a workout from it.
        </p>
        <v-text-field
          v-model="templateName"
          placeholder="Push day"
          aria-label="Template name"
          autocomplete="off"
          name="template-name"
          density="compact"
          :autofocus="hasKeyboard"
          @keydown.enter="saveTemplate"
        />
        <div class="template-actions">
          <v-btn variant="outlined" :disabled="isSavingTemplate" @click="isTemplateOpen = false">Cancel</v-btn>
          <v-btn
            color="accent-deep"
            variant="flat"
            :loading="isSavingTemplate"
            :disabled="!templateName.trim()"
            @click="saveTemplate"
          >
            Save
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="isCompleteOpen"
      title="Finish this workout?"
      message="The workout will be ended for good. You will not be able to start it again."
      confirm-label="Finish"
      tone="primary"
      :loading="isCompleting"
      @confirm="completeWorkout"
    />

    <ConfirmDialog
      v-model="isItemDeleteOpen"
      :title="itemDeleteTitle"
      :message="itemDeleteMessage"
      :loading="isDeletingItem"
      @confirm="confirmRemoveItem"
    />

    <ConfirmDialog
      v-model="isCustomDeleteOpen"
      title="Delete your exercise?"
      :message="customDeleteMessage"
      :loading="isDeletingCustom"
      @confirm="deleteCustomExercise"
    />

    <ConfirmDialog
      v-model="isDeleteOpen"
      title="Delete this workout?"
      message="The workout, its exercises and its sets will be permanently deleted."
      :loading="isDeleting"
      @confirm="deleteWorkout"
    />
  </div>
</template>

<style scoped>
/* clip, not hidden: hidden would turn the page into a scroll container and break the sticky bar */
.page {
  position: relative;
  overflow: hidden;
  overflow: clip;
  min-height: 100dvh;
  background: var(--color-night-floor);
  color: var(--color-text-primary);
  padding: var(--page-pad-top) var(--page-pad-right) var(--page-pad-bottom) var(--page-pad-left);
  box-sizing: border-box;
}

.container {
  position: relative;
  z-index: 1;
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 15px;
  cursor: pointer;
  padding: 8px 8px 8px 0;
  transition: color 0.2s var(--ease-out);
}

.back:hover {
  color: var(--color-text-primary);
}

/* As tall as Stop and Finish below: a thumb has to hit these too */
.delete-workout,
.save-template {
  height: 36px;
}

/* The title keeps its own line height; the button hangs into the card's padding so its label ends at the content edge */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 36px;
  margin: -8px 0 0;
}

.card-head .section-title {
  margin: 0;
}

.save-template {
  margin-right: -12px;
  color: var(--color-text-secondary);
}

.timer-bar {
  position: sticky;
  top: max(8px, env(safe-area-inset-top, 0px));
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
}

.timer-info {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.time.done {
  color: var(--color-accent);
}

.timer-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.finished-tag {
  margin: 0;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.card {
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-card);
  padding: 20px 22px;
  box-shadow: var(--shadow-panel);
}

/* Same label as the dashboard's section titles */
.section-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.dialog-title {
  margin: 0;
  font-size: 18px;
}

.muted {
  color: var(--color-text-muted);
  margin: 0;
}

.small {
  font-size: 13px;
}

.empty {
  padding: 8px 0 4px;
  font-size: 15px;
  line-height: 1.5;
}

.error {
  color: var(--color-danger-text);
  font-size: 14px;
  margin: 0;
}

.set-error {
  margin-top: 6px;
}

/* Keeps a focused field clear of the sticky timer bar */
.exercise-block {
  padding: 14px 0;
  border-top: 1px solid var(--color-divider);
  scroll-margin-top: 96px;
}

.exercise-block:first-of-type {
  border-top: none;
}

.exercise-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.exercise-info {
  min-width: 0;
}

.exercise-name {
  margin: 0;
  font-weight: 700;
}

/* Marks a compound exercise; the tap area reaches past the small circle */
.compound-btn {
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  /* No button padding, or the letter is pushed off-centre; the half pixel evens out the C's open side */
  padding: 0 0.5px 0 0;
  margin-left: 6px;
  vertical-align: text-bottom;
  background: none;
  border: 1px solid var(--color-accent);
  border-radius: 50%;
  /* Blush, not the accent itself: a letter this small needs the contrast */
  color: var(--color-accent-blush);
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    color 0.2s var(--ease-out),
    background 0.2s var(--ease-out);
}

.compound-btn::after {
  content: '';
  position: absolute;
  inset: -10px;
}

.compound-btn[aria-expanded='true'] {
  background: var(--color-accent);
  color: var(--color-night-floor);
}

/* Read between sets: body-size, high-contrast numbers; only the label is quiet */
.last-time {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.last-time-label {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
}

.template-dialog {
  padding: 20px 22px;
  overscroll-behavior: contain;
}

.template-hint {
  margin: 6px 0 14px;
}

.template-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

/* 36px square: big enough to hit with a thumb between sets */
.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  margin: -6px -8px -6px 0;
  flex-shrink: 0;
  background: none;
  border: none;
  border-radius: var(--radius-field);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  transition:
    color 0.2s var(--ease-out),
    background 0.2s var(--ease-out);
}

.icon-btn:active {
  background: var(--color-surface-hover);
}

.icon-btn:hover {
  color: var(--color-danger-text);
}

.sets {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}

.sets li,
.picker li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.set-number {
  color: var(--color-text-muted);
}

.set-form {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

/* As tall as the fields beside it */
.add-set {
  height: 40px;
  min-width: 64px;
  flex-shrink: 0;
}

.add-exercise {
  margin-top: 8px;
}

.picker-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(80dvh, 640px);
  padding: 18px 20px 8px;
  overscroll-behavior: contain;
}

.picker-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.picker-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0 -6px;
  padding: 0 6px 10px;
}

.create-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.group {
  border-top: 1px solid var(--color-divider);
  padding: 8px 0;
}

.group:first-of-type {
  border-top: none;
}

.group summary {
  cursor: pointer;
  font-weight: 600;
  padding: 6px 0;
}

.picker {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

.picker-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.picker-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.picker-actions .icon-btn {
  margin: 0;
}

.added {
  margin-left: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
}

@media (max-width: 380px) {
  .timer-bar {
    gap: 8px;
    padding: 10px;
  }

  .time {
    font-size: 24px;
  }
}
</style>
