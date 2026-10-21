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

    // Root took a permission away while the app was open: say so, and learn what is still allowed
    // so the app hides the rest. Other 403s (not the owner, not friends) are the page's to handle
    if (error.response?.status === 403 && error.response.data?.code === 'permission_denied') {
      const { authStore } = await import('../stores/auth')
      const { notice } = await import('../stores/notice')
      notice.show(error.response.data.message)
      authStore.fetchUser()
    }

    return Promise.reject(error)
  },
)

export function ensureCsrfCookie() {
  return axios.get(`${backendUrl}/sanctum/csrf-cookie`, { withCredentials: true })
}

export default api
