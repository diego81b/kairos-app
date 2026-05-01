<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Agent } from '~/types'

const agentApi = useAgentApi()
const toast = useToast()

const agents = ref<Agent[]>([])
const loading = ref(false)
const showCreate = ref(false)
const selectedAgent = ref<Agent | null>(null)

const AGENT_TYPE_LABELS: Record<string, string> = {
  pm: 'PM',
  architect: 'Architect',
  reviewer: 'Reviewer',
  tester: 'Tester',
  planner: 'Planner',
}

async function load() {
  loading.value = true
  try {
    agents.value = await agentApi.listAllAgents()
  } catch {
    toast.add({ title: 'Errore nel caricamento agenti', color: 'error' })
  } finally {
    loading.value = false
  }
}

function openConfig(agent: Agent) {
  selectedAgent.value = agent
}

function onCreated() {
  showCreate.value = false
  load()
}

const columns: TableColumn<Agent>[] = [
  { accessorKey: 'name', header: 'Nome' },
  {
    accessorKey: 'agentType',
    header: 'Tipo',
    cell: ({ row }) => AGENT_TYPE_LABELS[row.original.agentType] ?? row.original.agentType,
  },
  {
    accessorKey: 'visibility',
    header: 'Visibilità',
    cell: ({ row }) => row.original.visibility === 'global' ? 'Globale' : 'Privato',
  },
  {
    accessorKey: 'isActive',
    header: 'Stato',
    cell: ({ row }) => row.original.isActive ? 'Attivo' : 'Inattivo',
  },
  {
    id: 'actions',
    header: '',
  },
]

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <p class="text-sm text-gray-500">Gestisci i tuoi agenti e le loro configurazioni.</p>
      <UButton icon="i-lucide-plus" size="sm" @click="showCreate = true">Nuovo agente</UButton>
    </div>

    <UTable :data="agents" :columns="columns" :loading="loading">
      <template #actions-cell="{ row }">
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-settings"
          @click="openConfig(row.original)"
        >
          Configura
        </UButton>
      </template>
    </UTable>

    <SettingsAgentCreateSlideover
      v-model:open="showCreate"
      @created="onCreated"
    />

    <SettingsAgentConfigSlideover
      v-if="selectedAgent"
      :agent="selectedAgent"
      :open="!!selectedAgent"
      @update:open="(v) => { if (!v) selectedAgent = null }"
      @saved="load"
    />
  </div>
</template>
