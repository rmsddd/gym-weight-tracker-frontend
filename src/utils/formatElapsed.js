export function elapsedSecondsBetween(startedAt, endMs) {
  if (!startedAt) return 0
  return Math.max(0, Math.floor((endMs - new Date(startedAt).getTime()) / 1000))
}

export function formatElapsed(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// How long a friend has been at it since their last start or resume; frozen at the stop while stopped
export function liveWorkoutSeconds(workout, nowMs) {
  const end = workout.finished_at ? new Date(workout.finished_at).getTime() : nowMs
  return elapsedSecondsBetween(workout.resumed_at ?? workout.started_at, end)
}
