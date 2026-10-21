import { onBeforeUnmount, onMounted } from 'vue'

/**
 * Runs load() now and again every interval() ms while the page is open and the tab is visible.
 * A hidden tab stops asking; coming back loads at once. The next wait starts after a load ends,
 * so a slow answer never stacks requests.
 */
export function usePolling(load, interval) {
  let timerId = null
  let stopped = false

  async function tick() {
    clearTimeout(timerId)
    if (stopped || document.visibilityState === 'hidden') return
    try {
      await load()
    } finally {
      if (!stopped && document.visibilityState !== 'hidden') {
        timerId = setTimeout(tick, interval())
      }
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') tick()
    else clearTimeout(timerId)
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    tick()
  })

  onBeforeUnmount(() => {
    stopped = true
    clearTimeout(timerId)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { refresh: tick }
}
