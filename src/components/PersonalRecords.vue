<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../services/api'
import PageLayout from './ui/PageLayout.vue'
import SkeletonList from './ui/SkeletonList.vue'

const records = ref([])
const search = ref('')
const isLoading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    const response = await api.get('/personal-records')
    records.value = response.data.data ?? response.data
  } catch (error) {
    errorMessage.value = 'Could not load your personal records.'
    console.error('Failed to load personal records:', error)
  } finally {
    isLoading.value = false
  }
})

const filteredRecords = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return records.value
  return records.value.filter((record) => record.exercise.name.toLowerCase().includes(term))
})

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <PageLayout title="Personal records">
    <v-text-field
      v-if="records.length > 0"
      v-model="search"
      placeholder="Search exercises…"
      aria-label="Search exercises"
      autocomplete="off"
      name="record-search"
      density="compact"
      clearable
    />

    <SkeletonList v-if="isLoading" />
    <p v-else-if="errorMessage" class="error" role="alert">{{ errorMessage }}</p>
    <p v-else-if="records.length === 0" class="muted">
      No records yet. Log a set in a workout and your best one will show up here.
    </p>
    <p v-else-if="filteredRecords.length === 0" class="muted">No exercises match "{{ search }}".</p>

    <div class="record-list">
      <v-card
        v-for="record in filteredRecords"
        :key="record.exercise.id"
        color="surface"
        class="record-row pressable"
        :to="`/workouts/${record.workout_id}`"
        :ripple="false"
      >
        <div class="record-info">
          <p class="record-name">{{ record.exercise.name }}</p>
          <p class="record-meta">
            {{ record.exercise.category?.name }} · {{ formatDate(record.date) }}
          </p>
        </div>
        <p class="record-value">{{ record.weight }} kg × {{ record.reps }}</p>
      </v-card>
    </div>
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

.record-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  color: inherit;
}

.record-row:hover {
  background: var(--color-surface-hover);
}

.record-info {
  min-width: 0;
}

.record-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-meta {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.record-value {
  margin: 0;
  flex-shrink: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
}
</style>
