import axios from 'axios'

const TOKEN_KEY = 'circl_token'

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  },
}

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// The store is injected to avoid a circular import (store -> slices -> api).
export function onUnauthorized(handler) {
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      const url = err.config?.url || ''
      if (err.response?.status === 401 && !url.startsWith('/auth/login')) handler()
      return Promise.reject(err)
    },
  )
}

export const errorMessage = (err) => {
  const status = err.response?.status
  // No response, or a proxy/gateway failure: the API itself is unreachable.
  if (!err.response || status === 502 || status === 503 || status === 504) {
    return 'Cannot reach the server. Check your connection and try again.'
  }
  return err.response.data?.message || 'Something went wrong. Try again.'
}
export const fieldErrors = (err) => err.response?.data?.errors || {}
