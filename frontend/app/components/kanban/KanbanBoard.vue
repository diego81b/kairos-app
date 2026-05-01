<template>
  <div class="overflow-x-auto pb-4">
    <div class="flex gap-4" style="min-width: max-content">
      <KanbanColumn
        v-for="col in columns"
        :key="col.id"
        :column="col"
        :issues="issuesByColumn[col.id] ?? []"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const columns = [
  { id: 'backlog',   label: 'Backlog',    icon: 'i-heroicons-inbox',         color: 'gray' },
  { id: 'pm',        label: 'PM',         icon: 'i-heroicons-document-text',  color: 'blue' },
  { id: 'architect', label: 'Architect',  icon: 'i-heroicons-cube',           color: 'violet' },
  { id: 'review',    label: 'Review',     icon: 'i-heroicons-magnifying-glass', color: 'amber' },
  { id: 'test',      label: 'Test',       icon: 'i-heroicons-beaker',         color: 'green' },
  { id: 'release',   label: 'Release',    icon: 'i-heroicons-rocket-launch',  color: 'emerald' },
] as const

// Placeholder — will be replaced with real data when Issue CRUD is implemented
const issuesByColumn = computed(() => ({} as Record<string, never[]>))
</script>
