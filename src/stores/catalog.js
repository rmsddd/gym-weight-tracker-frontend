import api from '../services/api'

// The exercise catalog and the categories rarely change, so they are fetched once per session
// and shared by every screen that needs them. The exercise list includes the user's own
// exercises, so the cache must be dropped whenever the logged-in user changes (see auth.js).
let exercisesPromise = null
let categoriesPromise = null

function load(url) {
  return api.get(url).then((response) => response.data.data ?? response.data)
}

// A failed request must not be remembered, or the screen could never retry
function remember(promise, forget) {
  promise.catch(forget)
  return promise
}

/** Resolves to a fresh array each time, so callers can change their copy freely. */
async function getExercises() {
  exercisesPromise ??= remember(load('/exercises'), () => (exercisesPromise = null))
  return [...(await exercisesPromise)]
}

async function getCategories() {
  categoriesPromise ??= remember(load('/categories'), () => (categoriesPromise = null))
  return [...(await categoriesPromise)]
}

/** Call after creating an exercise, so the next screen sees it without refetching. */
async function addExercise(exercise) {
  if (!exercisesPromise) return
  try {
    ;(await exercisesPromise).push(exercise)
  } catch {
    // the list failed to load; the next getExercises() fetches it again, new exercise included
  }
}

function clear() {
  exercisesPromise = null
  categoriesPromise = null
}

export const catalogStore = { getExercises, getCategories, addExercise, clear }

export default catalogStore
