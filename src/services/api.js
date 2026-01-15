import axios from 'axios'

const API_BASE_URL = 'http://localhost:5228'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/Auth/refresh`, {
            refreshToken,
          })

          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.results
            localStorage.setItem('accessToken', accessToken)
            localStorage.setItem('refreshToken', newRefreshToken)
            originalRequest.headers.Authorization = `Bearer ${accessToken}`
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  signup: (data) => api.post('/api/Auth/signup', data),
  login: (data) => api.post('/api/Auth/login', data),
  logout: (refreshToken) => api.post('/api/Auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/api/Auth/refresh', { refreshToken }),
}

// Event API
export const eventApi = {
  getAll: (page = 1, pageSize = 10) =>
    api.get('/api/Event', { params: { page, pageSize } }),
  getById: (id) => api.get(`/api/Event/${id}`),
  create: (data) => api.post('/api/Event', data),
  update: (id, data) => api.put(`/api/Event/${id}`, data),
  delete: (id) => api.delete(`/api/Event/${id}`),
}

// Registration API
export const registrationApi = {
  getAll: (page = 1, pageSize = 10) =>
    api.get('/api/Registration', { params: { page, pageSize } }),
  getById: (id) => api.get(`/api/Registration/${id}`),
  getByEventId: (eventId, page = 1, pageSize = 10) =>
    api.get(`/api/Registration/event/${eventId}`, { params: { page, pageSize } }),
  create: (eventId) => api.post('/api/Registration', { eventId }),
  checkIn: (id) => api.patch(`/api/Registration/${id}/checkin`),
  checkOut: (id) => api.patch(`/api/Registration/${id}/checkout`),
}

export default api
