import { reactive, readonly } from 'vue'
import api, { ensureCsrfCookie } from '../services/api'
import catalogStore from './catalog'

const state = reactive({
  user: null,
  isLoading: false,
  isInitialized: false,
})

async function fetchUser() {
  state.isLoading = true

  try {
    const response = await api.get('/user')
    state.user = response.data
  } catch (error) {
    catalogStore.clear() // the exercise list is per user
    state.user = null
  } finally {
    state.isLoading = false
    state.isInitialized = true
  }

  return state.user
}

async function login(credentials) {
  await ensureCsrfCookie()

  const response = await api.post('/login', credentials)
  catalogStore.clear() // the exercise list is per user
  state.user = response.data.data.user
  state.isInitialized = true

  return state.user
}

// Only emails the confirmation link: the account exists (and can log in) once it is opened
async function register(payload) {
  await ensureCsrfCookie()

  const response = await api.post('/register', payload)

  return response.data.data.email
}

async function logout() {
  try {
    await api.post('/logout')
  } finally {
    catalogStore.clear() // the exercise list is per user
    state.user = null
  }
}

async function updateAvatar(avatar) {
  const response = await api.patch('/user/avatar', { avatar })
  state.user = response.data

  return state.user
}

function clearUser() {
  catalogStore.clear() // the exercise list is per user
  state.user = null
}

export const authStore = {
  state: readonly(state),
  fetchUser,
  login,
  register,
  logout,
  updateAvatar,
  clearUser,
}

export default authStore
