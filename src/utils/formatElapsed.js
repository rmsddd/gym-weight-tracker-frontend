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
