import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()

  if (auth.user?.role !== 'ADMIN') {
    return navigateTo('/home')
  }
})
