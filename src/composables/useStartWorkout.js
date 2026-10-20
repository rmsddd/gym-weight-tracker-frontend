import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

// Local date, not toISOString(): that one is UTC and gives yesterday or tomorrow near midnight
function todayLocal() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function useStartWorkout() {
  const router = useRouter()
  const isStarting = ref(false)
  const startingTemplateId = ref(null)

  // Opens the workout in progress instead of starting a second one; the newest if there are several
  async function startWorkout() {
    if (isStarting.value) return
    isStarting.value = true

    try {
      const response = await api.get('/workouts')
      const workouts = response.data.data ?? response.data
      const running = workouts
        .filter((workout) => workout.started_at != null && workout.finished_at == null)
        .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]

      await router.push(running ? `/workouts/${running.id}` : '/workouts/new')
    } catch (error) {
      console.error('Failed to look for a running workout:', error)
      await router.push('/workouts/new')
    } finally {
      isStarting.value = false
    }
  }

  // Starts today's workout with the template's exercises already in it, and opens it.
  // Throws when the workout could not be created, so the caller can show its own message.
  async function startFromTemplate(template) {
    if (startingTemplateId.value !== null) return
    startingTemplateId.value = template.id

    try {
      const response = await api.post('/workouts', {
        name: template.name,
        date: todayLocal(),
        template_id: template.id,
      })
      await router.push(`/workouts/${response.data.data.id}`)
    } finally {
      startingTemplateId.value = null
    }
  }

  return { isStarting, startWorkout, startingTemplateId, startFromTemplate }
}
