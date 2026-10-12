import axios from 'axios'

// In productie, frontend-ul e servit de Laravel de pe aceeasi adresa
const backendUrl = import.meta.env.PROD ? '' : 'http://localhost:8000'

const api = axios.create({
  baseURL: `${backendUrl}/api`,
  withCredentials: true,
  withXSRFToken: true,
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { authStore } = await import('../stores/auth')
      authStore.clearUser()
    }

    return Promise.reject(error)
  },
)

export function ensureCsrfCookie() {
  return axios.get(`${backendUrl}/sanctum/csrf-cookie`, { withCredentials: true })
}

export default api
