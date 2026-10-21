<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import authStore from '../stores/auth'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'
import UnderlineField from './ui/UnderlineField.vue'

const router = useRouter()

// Local date, not toISOString(): that one is UTC and gives yesterday or tomorrow near midnight
function todayLocal() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const name = ref('')
const date = ref(todayLocal())
const note = ref('')
const errorMessage = ref('')
const isSaving = ref(false)
const templates = ref([])
const templateId = ref(null)
// The name last filled in from a template, so a name the user typed is never overwritten
let suggestedName = ''

onMounted(async () => {
  // Without templates.view there is simply no template to pick
  if (!authStore.can('templates.view')) return

  try {
    const response = await api.get('/workout-templates')
    templates.value = response.data.data ?? response.data
  } catch (error) {
    console.error('Failed to load templates:', error)
  }
})

const selectedTemplate = computed(() => templates.value.find((t) => t.id === templateId.value) ?? null)

// Picking a template suggests its name for the workout; picking another one swaps the suggestion
function chooseTemplate(id) {
  templateId.value = id
  if (name.value !== '' && name.value !== suggestedName) return

  suggestedName = selectedTemplate.value?.name ?? ''
  name.value = suggestedName
}

async function handleSubmit() {
  // A second click or Enter while the first request is on its way would create the workout twice
  if (isSaving.value) return
  isSaving.value = true
  errorMessage.value = ''

  try {
    const response = await api.post('/workouts', {
      name: name.value || null,
      date: date.value,
      note: note.value || null,
      template_id: templateId.value,
    })

    // replace, not push: the form should not stay in history, or leaving the workout would land back on it
    router.replace(`/workouts/${response.data.data.id}`)
  } catch (error) {
    errorMessage.value = 'Could not start the workout. Check the details you entered.'
    console.error('Failed to save workout:', error)
    // Only released on failure: after a success the page is already navigating away
    isSaving.value = false
  }
}
</script>

<template>
  <div class="add-workout-page">
    <AmbientBackground />
    <FormCard title="New workout" max-width="400px" @submit.prevent="handleSubmit">
      <fieldset v-if="templates.length > 0" class="template-picker">
        <legend class="picker-label">Start from</legend>
        <div class="template-options">
          <button
            type="button"
            class="template-option"
            :class="{ selected: templateId === null }"
            :aria-pressed="templateId === null"
            @click="chooseTemplate(null)"
          >
            Empty workout
          </button>
          <button
            v-for="template in templates"
            :key="template.id"
            type="button"
            class="template-option"
            :class="{ selected: templateId === template.id }"
            :aria-pressed="templateId === template.id"
            @click="chooseTemplate(template.id)"
          >
            {{ template.name }}
          </button>
        </div>
        <p v-if="selectedTemplate" class="template-preview">
          {{ selectedTemplate.exercises.map((e) => e.name).join(' · ') }}
        </p>
      </fieldset>

      <UnderlineField id="name" v-model="name" label="Name (optional)" type="text" placeholder="Chest and triceps" />

      <!-- Most workouts are today's and have no note, so these stay out of the way -->
      <details class="more">
        <summary>Date and note</summary>
        <UnderlineField id="date" v-model="date" label="Date" type="date" required />
        <UnderlineField id="note" v-model="note" label="Note" multiline rows="3" placeholder="Notes…" />
      </details>

      <div class="actions">
        <BaseButton variant="secondary" size="lg" @click="router.push('/dashboard')">Cancel</BaseButton>
        <BaseButton type="submit" size="lg" :disabled="isSaving">
          {{ isSaving ? 'Starting…' : 'Start workout' }}
        </BaseButton>
      </div>

      <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    </FormCard>
  </div>
</template>

<style scoped>
.add-workout-page {
  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-night-floor);
  padding: 24px;
}

.template-picker {
  margin: 0 0 18px;
  padding: 0;
  border: none;
  min-width: 0;
}

.picker-label {
  margin-bottom: 8px;
  padding: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.template-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* One tap picks a template; tall enough to hit with a thumb */
.template-option {
  min-height: 40px;
  max-width: 100%;
  padding: 8px 14px;
  background: var(--color-surface-low);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-field);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
  cursor: pointer;
  transition:
    background 0.2s var(--ease-out),
    border-color 0.2s var(--ease-out),
    color 0.2s var(--ease-out);
}

.template-option:hover {
  background: var(--color-surface-hover);
}

.template-option.selected {
  border-color: var(--color-accent);
  color: var(--color-text-primary);
}

.template-preview {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--color-text-muted);
}

.more {
  margin-bottom: 8px;
}

.more summary {
  padding: 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.more[open] summary {
  margin-bottom: 10px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.actions > * {
  flex: 1;
}

.error {
  color: var(--color-danger-text);
  font-size: 14px;
  margin-top: 14px;
  margin-bottom: 0;
}
</style>
