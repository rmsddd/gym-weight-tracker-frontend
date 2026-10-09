<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import authStore from '../stores/auth'
import AvatarPicker from './ui/AvatarPicker.vue'
import BaseButton from './ui/BaseButton.vue'
import BodyAvatar from './ui/BodyAvatar.vue'
import PageLayout from './ui/PageLayout.vue'

const router = useRouter()

const totals = ref({ workouts_count: 0, total_minutes: 0, records_count: 0 })
const isPickerOpen = ref(false)
const muscleStats = ref([])

onMounted(async () => {
  try {
    // Totals come pre-computed, instead of downloading every workout and record to count them
    const [totalsRes, musclesRes] = await Promise.all([
      api.get('/profile-stats'),
      api.get('/muscle-stats'),
    ])
    totals.value = totalsRes.data.data ?? totalsRes.data
    muscleStats.value = musclesRes.data.data ?? musclesRes.data
  } catch (error) {
    console.error('Failed to load profile stats:', error)
  }
})

// { chest: 2, legs: 0, ... } for the full-body avatar, keyed by lowercased category name
const muscleLevels = computed(() =>
  Object.fromEntries(muscleStats.value.map((stat) => [stat.category.name.toLowerCase(), stat.level])),
)

function frequencyLabel(stat) {
  if (stat.sessions === 0) return 'Not trained'
  return `${stat.sessions}× this week`
}

const user = computed(() => authStore.state.user)

const memberSince = computed(() =>
  user.value?.created_at
    ? new Date(user.value.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—',
)

const totalTime = computed(() => {
  const hours = Math.floor(totals.value.total_minutes / 60)
  const minutes = totals.value.total_minutes % 60
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`
})

const stats = computed(() => [
  { label: 'Workouts logged', value: totals.value.workouts_count },
  { label: 'Total training time', value: totalTime.value },
  { label: 'Personal records', value: totals.value.records_count },
])

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <PageLayout title="Profile">
    <v-card color="surface-bright" border class="panel build">
      <div class="build-figure">
        <BodyAvatar :code="user?.avatar" :levels="muscleLevels" :width="150" />
        <BaseButton variant="secondary" size="sm" @click="isPickerOpen = true">Change avatar</BaseButton>
      </div>

      <div class="build-info">
        <h2 class="build-title">Your build</h2>
        <p class="build-hint">Each muscle group grows with every workout this week. Resets on Monday.</p>

        <ul class="muscles">
          <li v-for="stat in muscleStats" :key="stat.category.id" class="muscle">
            <span class="muscle-name">{{ stat.category.name }}</span>
            <span class="muscle-frequency">{{ frequencyLabel(stat) }}</span>
            <span class="muscle-bar" role="img" :aria-label="`Level ${stat.level} of 3`">
              <span v-for="step in 3" :key="step" class="muscle-step" :class="{ on: step <= stat.level }"></span>
            </span>
          </li>
        </ul>
      </div>
    </v-card>

    <v-card color="surface-bright" border class="panel">
      <p class="label">Name</p>
      <p class="value">{{ user?.name }}</p>
      <p class="label">Email</p>
      <p class="value">{{ user?.email }}</p>
      <p class="label">Member since</p>
      <p class="value last">{{ memberSince }}</p>
    </v-card>

    <section class="stats">
      <v-card v-for="stat in stats" :key="stat.label" color="surface" class="stat-card">
        <p class="stat-label">{{ stat.label }}</p>
        <p class="stat-value">{{ stat.value }}</p>
      </v-card>
    </section>

    <BaseButton variant="secondary" size="lg" block @click="handleLogout">Log out</BaseButton>

    <AvatarPicker v-model="isPickerOpen" />
  </PageLayout>
</template>

<style scoped>
.panel {
  padding: 20px 22px;
  box-shadow: var(--shadow-panel);
}

.build {
  display: flex;
  align-items: flex-start;
  gap: 22px;
}

.build-figure {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.build-info {
  flex: 1;
  min-width: 0;
}

.build-title {
  margin: 0 0 4px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  line-height: 1.2;
}

.build-hint {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.muscles {
  list-style: none;
  margin: 0;
  padding: 0;
}

.muscle {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  column-gap: 10px;
  row-gap: 5px;
  padding: 8px 0;
  border-top: 1px solid var(--color-divider);
}

.muscle:first-child {
  border-top: none;
  padding-top: 0;
}

.muscle-name {
  font-size: 15px;
  font-weight: 700;
}

.muscle-frequency {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
}

.muscle-bar {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.muscle-step {
  height: 5px;
  border-radius: 2px;
  background: var(--color-surface-low);
}

.muscle-step.on {
  background: var(--color-accent);
}

@media (max-width: 460px) {
  .build {
    flex-direction: column;
    align-items: stretch;
  }
}

.label {
  margin: 0 0 4px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.value {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.value.last {
  margin-bottom: 0;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-card {
  flex: 1 1 140px;
  min-width: 0;
  padding: 16px;
}

.stat-label {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.stat-value {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
</style>
