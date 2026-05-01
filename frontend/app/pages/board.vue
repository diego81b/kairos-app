<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Kanban Board</h1>
      <UButton icon="i-heroicons-plus" size="sm">New Issue</UButton>
    </div>

    <KanbanBoard />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>
