<template>
  <div class="w-72 flex-shrink-0">
    <!-- Column header -->
    <div class="mb-3 flex items-center gap-2">
      <UIcon :name="column.icon" class="size-4 text-gray-500" />
      <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ column.label }}</span>
      <UBadge :label="String(issues.length)" variant="soft" size="xs" class="ml-auto" />
    </div>

    <!-- Issue cards -->
    <div class="min-h-32 space-y-2 rounded-xl bg-gray-100 p-2 dark:bg-gray-800/50">
      <KanbanCard v-for="issue in issues" :key="issue.id" :issue="issue" />

      <div v-if="issues.length === 0" class="flex h-24 items-center justify-center">
        <p class="text-xs text-gray-400">No issues</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Column {
  id: string
  label: string
  icon: string
  color: string
}

interface Issue {
  id: string
  title: string
  source: string
  status: string
}

defineProps<{
  column: Column
  issues: Issue[]
}>()
</script>
