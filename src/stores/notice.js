import { reactive, readonly } from 'vue'

// One short message at a time, shown by App.vue at the bottom of the screen
const state = reactive({
  message: '',
  isVisible: false,
})

function show(message) {
  state.message = message
  state.isVisible = true
}

function hide() {
  state.isVisible = false
}

export const notice = {
  state: readonly(state),
  show,
  hide,
}

export default notice
