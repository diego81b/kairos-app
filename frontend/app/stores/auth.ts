import { defineStore } from 'pinia'

interface User {
  id: string
  email: string
  name?: string
  role: string
  workspace: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken && !!state.user,
  },

  actions: {
    async login(email: string, password: string) {
      const config = useRuntimeConfig()
      const data = await $fetch<{ success: boolean; data: { accessToken: string; refreshToken: string; user: User } }>(
        `${config.public.apiBaseUrl}/auth/login`,
        { method: 'POST', body: { email, password } },
      )
      this._setSession(data.data)
    },

    async register(email: string, password: string, name?: string) {
      const config = useRuntimeConfig()
      const data = await $fetch<{ success: boolean; data: { accessToken: string; refreshToken: string; user: User } }>(
        `${config.public.apiBaseUrl}/auth/register`,
        { method: 'POST', body: { email, password, name } },
      )
      this._setSession(data.data)
    },

    async refreshTokens() {
      if (!this.refreshToken) throw new Error('No refresh token')
      const config = useRuntimeConfig()
      const data = await $fetch<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
        `${config.public.apiBaseUrl}/auth/refresh`,
        { method: 'POST', body: { refreshToken: this.refreshToken } },
      )
      this.accessToken = data.data.accessToken
      this.refreshToken = data.data.refreshToken
      if (import.meta.client) {
        localStorage.setItem('refreshToken', data.data.refreshToken)
      }
    },

    async logout() {
      try {
        if (this.refreshToken) {
          const config = useRuntimeConfig()
          await $fetch(`${config.public.apiBaseUrl}/auth/logout`, {
            method: 'POST',
            body: { refreshToken: this.refreshToken },
          })
        }
      } finally {
        this._clearSession()
        await navigateTo('/login')
      }
    },

    loadFromStorage() {
      if (!import.meta.client) return
      const token = localStorage.getItem('refreshToken')
      if (token) this.refreshToken = token
    },

    _setSession(data: { accessToken: string; refreshToken: string; user: User }) {
      this.accessToken = data.accessToken
      this.refreshToken = data.refreshToken
      this.user = data.user
      if (import.meta.client) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }
    },

    _clearSession() {
      this.accessToken = null
      this.refreshToken = null
      this.user = null
      if (import.meta.client) {
        localStorage.removeItem('refreshToken')
      }
    },
  },
})
