<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

definePageMeta({ middleware: 'auth' })

const items: TabsItem[] = [
  { label: 'Agenti', icon: 'i-lucide-bot', slot: 'agents' as const },
  { label: 'Provider', icon: 'i-lucide-server', slot: 'providers' as const },
  { label: 'Credenziali', icon: 'i-lucide-key', slot: 'credentials' as const },
]
</script>

<template>
  <div>
    <h1 class="mb-6 text-xl font-semibold text-gray-900 dark:text-white">Impostazioni</h1>

    <UTabs :items="items" class="w-full" :unmount-on-hide="false">
      <template #agents>
        <LazySettingsAgentsTab class="mt-4" />
      </template>

      <template #providers>
        <LazySettingsProvidersTab class="mt-4" />
      </template>

      <template #credentials>
        <LazySettingsCredentialsTab class="mt-4" />
      </template>
    </UTabs>
  </div>
</template>
