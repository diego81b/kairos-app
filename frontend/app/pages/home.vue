<template>
  <div class="mx-auto max-w-2xl">
    <UCard>
      <template #header>
        <h1 class="text-xl font-semibold">Benvenuto, {{ auth.user?.name ?? auth.user?.email }}</h1>
      </template>

      <dl class="space-y-3 text-sm">
        <div class="flex gap-2">
          <dt class="w-28 font-medium text-gray-500">Email</dt>
          <dd>{{ auth.user?.email }}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="w-28 font-medium text-gray-500">Ruolo</dt>
          <dd>{{ auth.user?.role }}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="w-28 font-medium text-gray-500">Workspace</dt>
          <dd>{{ auth.user?.workspace }}</dd>
        </div>
      </dl>

      <template #footer>
        <UButton to="/board" variant="soft" size="sm">
          Vai al Board
        </UButton>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
const auth = useAuthStore()
</script>
