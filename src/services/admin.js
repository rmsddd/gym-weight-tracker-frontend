import api from './api'

// The root page's API: roles, what each may do, and who has which. The server refuses all of it
// to anyone but root.
const data = (response) => response.data.data ?? response.data

export const adminApi = {
  permissions: () => api.get('/admin/permissions').then(data),
  roles: () => api.get('/admin/roles').then(data),
  createRole: (name) => api.post('/admin/roles', { name }).then(data),
  renameRole: (id, name) => api.patch(`/admin/roles/${id}`, { name }).then(data),
  deleteRole: (id) => api.delete(`/admin/roles/${id}`),
  setPermissions: (id, permissions) =>
    api.put(`/admin/roles/${id}/permissions`, { permissions }).then(data),
  // { data, meta } so the page knows whether more pages follow
  users: (params) => api.get('/admin/users', { params }).then((response) => response.data),
  setUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }).then(data),
}

export default adminApi
