import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const publicRoutes = ['/login', '/register']

  if (!auth.isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  if (auth.isAuthenticated && publicRoutes.includes(to.path)) {
    return navigateTo('/home')
  }
})
