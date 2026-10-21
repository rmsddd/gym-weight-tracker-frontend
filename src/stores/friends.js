import { reactive, readonly } from 'vue'
import api from '../services/api'

// Pending requests sent to the user, so the navigation can show how many wait for an answer
const state = reactive({
  incomingCount: 0,
})

async function fetchRequests() {
  const response = await api.get('/friend-requests')
  const requests = response.data.data
  state.incomingCount = requests.incoming.length

  return requests
}

// For the badge only: a failure just leaves the last count in place
async function refreshIncomingCount() {
  try {
    await fetchRequests()
  } catch (error) {
    console.error('Failed to load friend requests:', error)
  }
}

function clear() {
  state.incomingCount = 0
}

export const friendsStore = {
  state: readonly(state),
  fetchRequests,
  refreshIncomingCount,
  clear,
}

export default friendsStore
