<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mdiDeleteOutline } from '@mdi/js'
import api from '../services/api'
import BaseButton from './ui/BaseButton.vue'
import PageLayout from './ui/PageLayout.vue'
import SkeletonList from './ui/SkeletonList.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'

const router = useRouter()

const templates = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const templateToDelete = ref(null)
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const startingId = ref(null)

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

// Starts today's workout with the template's exercises already in it, and opens it
async function startFrom(template) {
  if (startingId.value !== null) return
  errorMessage.value = ''
  startingId.value = template.id

  try {
    const today = new Date()
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const response = await api.post('/workouts', { name: template.name, date, template_id: template.id })
    router.push(`/workouts/${response.data.data.id}`)
  } catch (error) {
    errorMessage.value = 'Could not start the workout. Try again.'
    console.error('Failed to start workout from template:', error)
    startingId.value = null
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
    <p v-else-if="templates.length === 0 && !errorMessage" class="muted">
      No templates yet. Open a workout, then choose “Save as template” from its menu.
    </p>

    <ul v-else class="template-list">
      <li v-for="template in templates" :key="template.id" class="template-row">
        <div class="template-info">
          <p class="template-name">{{ template.name }}</p>
          <p class="template-meta">{{ template.exercises.map((e) => e.name).join(' · ') }}</p>
        </div>
        <div class="template-actions">
          <BaseButton size="sm" :disabled="startingId !== null" @click="startFrom(template)">
            {{ startingId === template.id ? 'Starting…' : 'Start' }}
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
</style>
