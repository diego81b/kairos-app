import type { FetchOptions } from 'ofetch'
import { useAuthStore } from '~/stores/auth'

// Module-level singleton: only one token refresh can be in flight at a time.
// If multiple requests receive 401 simultaneously they all await this same
// promise, so the refresh token is rotated exactly once.
let _refreshPromise: Promise<void> | null = null

export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  function ensureTokenRefreshed(): Promise<void> {
    if (!_refreshPromise) {
      _refreshPromise = authStore.refreshTokens().finally(() => {
        _refreshPromise = null
      })
    }
    return _refreshPromise
  }

  async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    if (authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`
    }

    try {
      return await $fetch<T>(`${config.public.apiBaseUrl}${path}`, {
        ...options,
        headers,
      })
    } catch (error: unknown) {
      const fetchError = error as { status?: number }
      if (fetchError?.status === 401 && authStore.refreshToken) {
        try {
          await ensureTokenRefreshed()
          headers['Authorization'] = `Bearer ${authStore.accessToken}`
          return await $fetch<T>(`${config.public.apiBaseUrl}${path}`, {
            ...options,
            headers,
          })
        } catch {
          authStore._clearSession()
          await navigateTo('/login')
          throw error
        }
      }
      throw error
    }
  }

  return {
    get: <T>(path: string, opts?: FetchOptions) => request<T>(path, { method: 'GET', ...opts }),
    post: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
      request<T>(path, { method: 'POST', body, ...opts }),
    put: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
      request<T>(path, { method: 'PUT', body, ...opts }),
    patch: <T>(path: string, body?: unknown, opts?: FetchOptions) =>
      request<T>(path, { method: 'PATCH', body, ...opts }),
    del: <T>(path: string, opts?: FetchOptions) => request<T>(path, { method: 'DELETE', ...opts }),
  }
}
