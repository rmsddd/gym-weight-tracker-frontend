<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AmbientBackground from './ui/AmbientBackground.vue'
import BaseButton from './ui/BaseButton.vue'
import FormCard from './ui/FormCard.vue'
import UnderlineField from './ui/UnderlineField.vue'

const router = useRouter()

const name = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const note = ref('')
const errorMessage = ref('')
const isSaving = ref(false)
const templates = ref([])
const templateId = ref(null)

onMounted(async () => {
  try {
    const response = await api.get('/workout-templates')
    templates.value = response.data.data ?? response.data
  } catch (error) {
    console.error('Failed to load templates:', error)
  }
})

// Picking a template suggests its name for the workout, unless the user already typed one
watch(templateId, (id) => {
  const template = templates.value.find((t) => t.id === id)
  if (template && !name.value) name.value = template.name
})

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
    errorMessage.value = 'Could not save the workout. Check the details you entered.'
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
      <v-select
        v-if="templates.length > 0"
        v-model="templateId"
        :items="templates"
        item-title="name"
        item-value="id"
        label="Start from a template (optional)"
        clearable
        density="compact"
        class="template-select"
      />
      <UnderlineField id="name" v-model="name" label="Name" type="text" placeholder="Chest and triceps" />
      <UnderlineField id="date" v-model="date" label="Date" type="date" required />
      <UnderlineField id="note" v-model="note" label="Note" multiline rows="3" placeholder="Notes…" />

      <div class="actions">
        <BaseButton variant="secondary" size="lg" @click="router.push('/dashboard')">Cancel</BaseButton>
        <BaseButton type="submit" size="lg" :disabled="isSaving">{{ isSaving ? 'Saving…' : 'Save' }}</BaseButton>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
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

.template-select {
  margin-bottom: 8px;
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
