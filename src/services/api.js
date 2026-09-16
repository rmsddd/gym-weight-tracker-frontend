import axios from 'axios'

const backendUrl = 'http://localhost:8000'

const api = axios.create({
  baseURL: `${backendUrl}/api`,
  withCredentials: true,
  withXSRFToken: true,
})

export function ensureCsrfCookie() {
  return axios.get(`${backendUrl}/sanctum/csrf-cookie`, { withCredentials: true })
}

export default api
