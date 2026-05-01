import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  auth.loadFromStorage()

  if (auth.refreshToken && !auth.accessToken) {
    try {
      await auth.refreshTokens()
      await auth.fetchMe()
    } catch {
      auth._clearSession()
    }
  }

  if (auth.isAuthenticated) {
    const route = useRoute()
    const publicRoutes = ['/login', '/register']
    if (publicRoutes.includes(route.path)) {
      await navigateTo('/home')
    }
  }
})
