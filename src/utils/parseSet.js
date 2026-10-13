// What the user typed into a set field, turned into numbers.

// "62,5" and "62.5" are the same number: a phone keypad only has the separator of its language
export function parseDecimal(value) {
  const text = String(value).trim().replace(',', '.')
  return /^(\d+\.?\d*|\.\d+)$/.test(text) ? Number(text) : NaN
}

// "10" or a range like "9-10"; null when it is neither
export function parseReps(value) {
  const match = String(value).trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
  if (!match) return null

  const reps = Number(match[1])
  const repsMax = match[2] != null ? Number(match[2]) : null
  if (repsMax != null && repsMax <= reps) return null

  return { reps, reps_max: repsMax }
}

// The phone keypad has no dash, so its separator key writes one in the reps field
export function repsAsTyped(value) {
  return (value ?? '').replace(/[.,]/g, '-')
}
