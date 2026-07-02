import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

// Attach admin JWT token if available
apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {
    // localStorage not available
  }
  return config
})

// On 401, clear token (admin will show login form)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem('admin_token')
      } catch {
        // ignore
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
