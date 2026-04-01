import axios from 'axios'
import {
  handleApiRequestFailure,
  handleServerConnectionFailure,
  handleServerConnectionRecovered,
} from '../composables/useConnectivityGuard.mjs'

// Base URL can be overridden by localStorage key 'nc_api'; defaults to '/api'
const apiBase = (typeof localStorage !== 'undefined' && localStorage.getItem('nc_api')) || '/api'

const api = axios.create({
  baseURL: apiBase,
  timeout: 10000,
})

// Attach token from localStorage for now (avoids depending on active Pinia during bootstrap)
api.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nc_token') : null
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => {
    handleServerConnectionRecovered()
    return res
  },
  (err) => {
    const status = err?.response?.status
    const code = err?.code
    const message = String(err?.message || '')

    const isNotFound = status === 404
    const isConnectionRefused = code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')
    const isNetworkFailure = !err?.response || code === 'ERR_NETWORK' || code === 'ECONNABORTED'

    // Optional: auto-clear token on 401
    if (status === 401 && typeof localStorage !== 'undefined') {
      localStorage.removeItem('nc_token')
    }

    // Show global "something went wrong" popup on expected API-level failures.
    if (isNotFound) {
      handleApiRequestFailure()
    }

    // Handle unreachable server cases centrally.
    if (isConnectionRefused) {
      handleServerConnectionFailure({ forceOffline: true })
    } else if (isNetworkFailure) {
      handleServerConnectionFailure()
    }

    return Promise.reject(err)
  }
)

export default api
