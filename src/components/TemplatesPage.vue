<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mdiDeleteOutline } from '@mdi/js'
import api from '../services/api'
import { useStartWorkout } from '../composables/useStartWorkout'
import catalogStore from '../stores/catalog'
import BaseButton from './ui/BaseButton.vue'
import PageLayout from './ui/PageLayout.vue'
import SkeletonList from './ui/SkeletonList.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'

const router = useRouter()
const { startingTemplateId, startFromTemplate } = useStartWorkout()

const templates = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const templateToDelete = ref(null)
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const isCreateOpen = ref(false)
const isCreating = ref(false)
const createError = ref('')
const newName = ref('')
const search = ref('')
const exercises = ref([])
// In the order they were picked, which is the order they get in the template
const selectedIds = ref([])

// Opening a dialog should not pop the on-screen keyboard on a phone
const hasKeyboard = window.matchMedia('(pointer: fine)').matches

onMounted(async () => {
  try {
    const response = await api.get('/workout-templates')
    templates.value = response.data.data ?? response.data
  } catch (error) {
    errorMessage.value = 'Could not load your templates.'
    console.error('Failed to load templates:', error)
  } finally {
    isLoading.value = false
  }
})

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

const selectedExercises = computed(() =>
  selectedIds.value.map((id) => exercises.value.find((e) => e.id === id)).filter(Boolean),
)

const canCreate = computed(() => newName.value.trim() !== '' && selectedIds.value.length > 0)

async function openCreate() {
  newName.value = ''
  search.value = ''
  selectedIds.value = []
  createError.value = ''
  isCreateOpen.value = true

  try {
    exercises.value = await catalogStore.getExercises()
  } catch (error) {
    createError.value = 'Could not load the exercises. Close this and try again.'
    console.error('Failed to load exercises:', error)
  }
}

function toggleExercise(id) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((selected) => selected !== id)
    : [...selectedIds.value, id]
}

async function createTemplate() {
  if (!canCreate.value || isCreating.value) return
  isCreating.value = true
  createError.value = ''

  try {
    const response = await api.post('/workout-templates', {
      name: newName.value.trim(),
      exercise_ids: selectedIds.value,
    })
    const created = response.data.data ?? response.data
    templates.value = [...templates.value, created].sort((a, b) => a.name.localeCompare(b.name))
    isCreateOpen.value = false
  } catch (error) {
    createError.value = 'Could not save the template. Try again.'
    console.error('Failed to create template:', error)
  } finally {
    isCreating.value = false
  }
}

// Starts today's workout with the template's exercises already in it, and opens it
async function startFrom(template) {
  errorMessage.value = ''

  try {
    await startFromTemplate(template)
  } catch (error) {
    errorMessage.value = 'Could not start the workout. Try again.'
    console.error('Failed to start workout from template:', error)
  }
}

function askDelete(template) {
  templateToDelete.value = template
  isDeleteOpen.value = true
}

async function confirmDelete() {
  isDeleting.value = true

  try {
    await api.delete(`/workout-templates/${templateToDelete.value.id}`)
    templates.value = templates.value.filter((t) => t.id !== templateToDelete.value.id)
  } catch (error) {
    errorMessage.value = 'Could not delete the template.'
    console.error('Failed to delete template:', error)
  } finally {
    isDeleteOpen.value = false
    isDeleting.value = false
  }
}
</script>

<template>
  <PageLayout title="Templates">
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>

    <SkeletonList v-if="isLoading" />
    <template v-else>
      <BaseButton block @click="openCreate">+ New template</BaseButton>

      <p v-if="templates.length === 0 && !errorMessage" class="muted">
        No templates yet. Create one here, or open a workout and choose “Save as template” from its menu.
      </p>

      <ul v-else class="template-list">
        <li v-for="template in templates" :key="template.id" class="template-row">
          <div class="template-info">
            <p class="template-name">{{ template.name }}</p>
            <p class="template-meta">{{ template.exercises.map((e) => e.name).join(' · ') }}</p>
          </div>
          <div class="template-actions">
            <BaseButton size="sm" :disabled="startingTemplateId !== null" @click="startFrom(template)">
              {{ startingTemplateId === template.id ? 'Starting…' : 'Start' }}
            </BaseButton>
            <v-btn
              :icon="mdiDeleteOutline"
              variant="text"
              size="small"
              color="secondary"
              :aria-label="`Delete ${template.name}`"
              @click="askDelete(template)"
            />
          </div>
        </li>
      </ul>

      <v-btn v-if="templates.length > 0" variant="outlined" @click="router.push('/workouts/new')">
        Start an empty workout
      </v-btn>
    </template>

    <v-dialog v-model="isCreateOpen" max-width="520" scrollable :persistent="isCreating">
      <v-card color="surface-bright" border class="create-dialog">
        <h2 class="dialog-title">New template</h2>

        <v-text-field
          v-model="newName"
          placeholder="Push day"
          aria-label="Template name"
          autocomplete="off"
          name="template-name"
          density="compact"
          hide-details
          :autofocus="hasKeyboard"
        />

        <p class="selection" aria-live="polite">
          <template v-if="selectedExercises.length === 0">Pick the exercises for this template.</template>
          <template v-else>
            <span class="selection-count">{{ selectedExercises.length }} selected</span>
            {{ selectedExercises.map((e) => e.name).join(' · ') }}
          </template>
        </p>

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

        <p v-if="createError" class="error" role="alert">{{ createError }}</p>

        <div class="picker-body">
          <p v-if="searchTerm !== '' && groupedExercises.length === 0" class="muted">
            No results for “{{ searchTerm }}”.
          </p>

          <details v-for="group in groupedExercises" :key="group.category" class="group" :open="searchTerm !== ''">
            <summary>
              {{ group.category }} <span class="group-count">({{ group.items.length }})</span>
            </summary>
            <ul class="picker">
              <li v-for="exercise in group.items" :key="exercise.id">
                <button
                  type="button"
                  class="pick"
                  :class="{ picked: selectedIds.includes(exercise.id) }"
                  :aria-pressed="selectedIds.includes(exercise.id)"
                  @click="toggleExercise(exercise.id)"
                >
                  <span class="pick-name">{{ exercise.name }}</span>
                  <span class="pick-mark" aria-hidden="true">{{ selectedIds.includes(exercise.id) ? '✓' : '+' }}</span>
                </button>
              </li>
            </ul>
          </details>
        </div>

        <div class="create-actions">
          <v-btn variant="outlined" :disabled="isCreating" @click="isCreateOpen = false">Cancel</v-btn>
          <v-btn
            color="accent-deep"
            variant="flat"
            :loading="isCreating"
            :disabled="!canCreate"
            @click="createTemplate"
          >
            Save template
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      v-model="isDeleteOpen"
      title="Delete this template?"
      message="Workouts you already started from it are not affected."
      :loading="isDeleting"
      @confirm="confirmDelete"
    />
  </PageLayout>
</template>

<style scoped>
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

.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.template-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  background: var(--color-surface-low);
  border-radius: var(--radius-card);
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.template-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
}

.template-meta {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.create-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: min(80dvh, 640px);
  padding: 18px 20px;
  overscroll-behavior: contain;
}

.dialog-title {
  margin: 0;
  font-size: 18px;
}

.selection {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--color-text-secondary);
}

.selection-count {
  display: block;
  font-size: 12px;
  color: var(--color-text-muted);
}

.picker-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  margin: 0 -6px;
  padding: 0 6px;
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

.group-count {
  font-size: 13px;
  font-weight: 400;
  color: var(--color-text-muted);
}

.picker {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
}

/* The whole row toggles, so it is easy to hit with a thumb */
.pick {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: var(--radius-field);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s var(--ease-out);
}

.pick:hover {
  background: var(--color-surface-hover);
}

.pick.picked {
  background: var(--color-surface-low);
}

.pick-name {
  min-width: 0;
  overflow-wrap: anywhere;
}

.pick-mark {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: var(--color-text-muted);
}

.pick.picked .pick-mark {
  color: var(--color-accent);
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
