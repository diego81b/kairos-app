<template>
  <UCard
    class="cursor-pointer transition-shadow hover:shadow-md"
    :ui="{ body: 'p-3' }"
  >
    <div class="space-y-2">
      <p class="text-sm font-medium leading-snug text-gray-900 dark:text-white">
        {{ issue.title }}
      </p>
      <div class="flex items-center gap-2">
        <UBadge :label="issue.source" variant="soft" size="xs" />
        <UBadge :label="issue.status" variant="outline" size="xs" class="ml-auto" />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  issue: {
    id: string
    title: string
    source: string
    status: string
  }
}>()
</script>
