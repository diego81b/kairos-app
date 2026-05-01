<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Top navbar -->
    <header class="sticky top-0 z-50 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div class="flex h-14 items-center justify-between px-4">
        <div class="flex items-center gap-3">
          <span class="text-lg font-bold tracking-tight text-primary-600">KAIROS</span>
          <nav class="hidden gap-1 sm:flex">
            <UButton
              to="/home"
              variant="ghost"
              size="sm"
              :class="$route.path === '/home' ? 'text-primary-600' : 'text-gray-600'"
            >
              Home
            </UButton>
            <UButton
              to="/board"
              variant="ghost"
              size="sm"
              :class="$route.path === '/board' ? 'text-primary-600' : 'text-gray-600'"
            >
              Board
            </UButton>
            <UButton
              to="/settings"
              variant="ghost"
              size="sm"
              :class="$route.path.startsWith('/settings') ? 'text-primary-600' : 'text-gray-600'"
            >
              Settings
            </UButton>
          </nav>
        </div>

        <div class="flex items-center gap-2">
          <span class="hidden text-sm text-gray-500 sm:block">{{ auth.user?.email }}</span>
          <UButton
            variant="ghost"
            size="sm"
            :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            @click="toggleTheme"
          />
          <UButton variant="ghost" size="sm" icon="i-heroicons-arrow-right-on-rectangle" @click="auth.logout()">
            Logout
          </UButton>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="p-4">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()

const isDark = ref(false)

onMounted(() => {
  const stored = localStorage.getItem('kairos-theme')
  isDark.value = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', isDark.value)
})

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('kairos-theme', isDark.value ? 'dark' : 'light')
  document.documentElement.classList.toggle('dark', isDark.value)
}
</script>
