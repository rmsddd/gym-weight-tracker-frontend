import { reactive, readonly } from 'vue'

// Set by the workout screen while its workout runs, so the app hides its navigation
const state = reactive({
  isFocused: false,
})

function setFocused(value) {
  state.isFocused = value
}

export const workoutFocus = {
  state: readonly(state),
  setFocused,
}

export default workoutFocus
