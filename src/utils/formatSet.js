// "9-10" when the last rep was a struggle, otherwise just the count
export function formatReps(set) {
  return set.reps_max != null ? `${set.reps}-${set.reps_max}` : String(set.reps)
}

// A set of a timed exercise (plank, cardio) has a duration instead of weight and reps.
// Works for anything shaped like a set: a logged set, a previous set or a personal record.
export function formatSet(set) {
  if (set.duration_minutes != null) return `${Number(set.duration_minutes)} min`
  return `${Number(set.weight)} kg × ${formatReps(set)}`
}
