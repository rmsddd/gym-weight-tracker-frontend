<script setup>
import { onMounted, ref } from 'vue'
import api from '../../services/api'
import { useStartWorkout } from '../../composables/useStartWorkout'

const templates = ref([])
const errorMessage = ref('')
const { startingTemplateId, startFromTemplate } = useStartWorkout()

onMounted(async () => {
  try {
    const response = await api.get('/workout-templates')
    templates.value = response.data.data ?? response.data
  } catch (error) {
    // "+ New" still works without the list
    console.error('Failed to load templates:', error)
  }
})

async function start(template) {
  errorMessage.value = ''

  try {
    await startFromTemplate(template)
  } catch (error) {
    errorMessage.value = 'Could not start the workout. Try again.'
    console.error('Failed to start workout from template:', error)
  }
}

function exerciseCount(template) {
  const count = template.exercises?.length ?? 0
  return `${count} ${count === 1 ? 'exercise' : 'exercises'}`
}
</script>

<template>
  <div>
    <ul class="shelf">
      <li v-for="template in templates" :key="template.id">
        <button
          type="button"
          class="shelf-card pressable"
          :disabled="startingTemplateId !== null"
          :aria-label="`Start ${template.name}`"
          @click="start(template)"
        >
          <span class="card-name">{{ template.name }}</span>
          <span class="card-meta">{{
            startingTemplateId === template.id ? 'Starting…' : exerciseCount(template)
          }}</span>
        </button>
      </li>
      <li>
        <RouterLink to="/templates?new=1" class="shelf-card new-card pressable">+ New</RouterLink>
      </li>
    </ul>
    <p v-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
/* Scrolls sideways under the page gutter, so the last card is not cut by the padding */
.shelf {
  display: flex;
  gap: 8px;
  margin: 0 calc(-1 * var(--page-pad-right)) 0 0;
  padding: 0 var(--page-pad-right) 4px 0;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
}

.shelf::-webkit-scrollbar {
  display: none;
}

.shelf > li {
  flex: 0 0 112px;
}

.shelf-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  height: 100%;
  min-height: 72px;
  padding: 12px;
  border: 0;
  border-radius: var(--radius-card);
  background: var(--color-surface-low);
  color: var(--color-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}

.shelf-card:hover {
  background: var(--color-surface-hover);
}

.shelf-card:disabled {
  cursor: default;
}

.card-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.card-meta {
  font-size: 13px;
  color: var(--color-text-muted);
}

.new-card {
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1.5px dashed var(--color-border-strong);
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-decoration: none;
}

.new-card:hover {
  background: transparent;
  border-color: var(--color-text-faint);
  color: var(--color-text-primary);
}

.error {
  margin: 10px 0 0;
  font-size: 14px;
  color: var(--color-danger-text);
}
</style>
