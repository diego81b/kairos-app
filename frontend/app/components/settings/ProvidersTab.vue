<script setup lang="ts">
import { z } from 'zod'
import type { TableColumn } from '@nuxt/ui'
import type { LlmProvider, CreateProviderPayload } from '~/types'

const auth = useAuthStore()
const providerApi = useProviderApi()
const toast = useToast()

const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const providers = ref<LlmProvider[]>([])
const loading = ref(false)
const showCreate = ref(false)
const testingId = ref<string | null>(null)

const schema = z.object({
  key: z.string().min(1, 'Chiave richiesta'),
  displayName: z.string().min(1, 'Nome richiesto'),
  baseUrl: z.string().url('URL non valido').optional().or(z.literal('')),
  enabled: z.boolean().optional(),
})

const form = reactive<CreateProviderPayload>({
  key: '',
  displayName: '',
  baseUrl: '',
  enabled: true,
})

const loadingCreate = ref(false)

async function load() {
  if (!isAdmin.value) return
  loading.value = true
  try {
    providers.value = await providerApi.listProviders()
  } catch {
    toast.add({ title: 'Errore nel caricamento provider', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function toggleEnabled(provider: LlmProvider) {
  try {
    await providerApi.updateProvider(provider.id, { enabled: !provider.enabled })
    provider.enabled = !provider.enabled
  } catch {
    toast.add({ title: 'Errore aggiornamento provider', color: 'error' })
  }
}

async function testConnection(provider: LlmProvider) {
  testingId.value = provider.id
  try {
    const res = await providerApi.testProvider(provider.id)
    toast.add({ title: res.success ? 'Connessione OK' : 'Connessione fallita', color: res.success ? 'success' : 'error' })
  } catch {
    toast.add({ title: 'Errore nel test connessione', color: 'error' })
  } finally {
    testingId.value = null
  }
}

async function deleteProvider(provider: LlmProvider) {
  try {
    await providerApi.deleteProvider(provider.id)
    providers.value = providers.value.filter(p => p.id !== provider.id)
    toast.add({ title: 'Provider eliminato', color: 'success' })
  } catch {
    toast.add({ title: 'Errore eliminazione provider', color: 'error' })
  }
}

async function onCreate() {
  loadingCreate.value = true
  try {
    const created = await providerApi.createProvider(form)
    providers.value.push(created)
    showCreate.value = false
    form.key = ''
    form.displayName = ''
    form.baseUrl = ''
    form.enabled = true
    toast.add({ title: 'Provider creato', color: 'success' })
  } catch {
    toast.add({ title: 'Errore nella creazione', color: 'error' })
  } finally {
    loadingCreate.value = false
  }
}

const columns: TableColumn<LlmProvider>[] = [
  { accessorKey: 'key', header: 'Chiave' },
  { accessorKey: 'displayName', header: 'Nome' },
  { accessorKey: 'baseUrl', header: 'Base URL' },
  { id: 'enabled', header: 'Abilitato' },
  { id: 'actions', header: '' },
]

onMounted(load)
</script>

<template>
  <div>
    <div v-if="!isAdmin" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
      <UIcon name="i-lucide-shield-alert" class="mr-1 size-4 inline" />
      Sezione riservata agli amministratori.
    </div>

    <template v-else>
      <div class="mb-4 flex items-center justify-between">
        <p class="text-sm text-gray-500">Gestisci i provider LLM disponibili.</p>
        <UButton icon="i-lucide-plus" size="sm" @click="showCreate = !showCreate">
          {{ showCreate ? 'Annulla' : 'Aggiungi provider' }}
        </UButton>
      </div>

      <!-- Form creazione inline -->
      <UCard v-if="showCreate" class="mb-4">
        <UForm :schema="schema" :state="form" class="grid grid-cols-2 gap-3" @submit="onCreate">
          <UFormField label="Chiave" name="key" required>
            <UInput v-model="form.key" placeholder="es. anthropic" class="w-full" />
          </UFormField>

          <UFormField label="Nome" name="displayName" required>
            <UInput v-model="form.displayName" placeholder="es. Anthropic" class="w-full" />
          </UFormField>

          <UFormField label="Base URL" name="baseUrl" class="col-span-2">
            <UInput v-model="form.baseUrl" placeholder="https://api.example.com (opzionale)" class="w-full" />
          </UFormField>

          <div class="col-span-2 flex justify-end gap-2">
            <UButton variant="ghost" @click="showCreate = false">Annulla</UButton>
            <UButton type="submit" :loading="loadingCreate">Crea</UButton>
          </div>
        </UForm>
      </UCard>

      <UTable :data="providers" :columns="columns" :loading="loading">
        <template #enabled-cell="{ row }">
          <UToggle :model-value="row.original.enabled" @update:model-value="toggleEnabled(row.original)" />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-lucide-plug"
              :loading="testingId === row.original.id"
              @click="testConnection(row.original)"
            >
              Test
            </UButton>
            <UButton
              variant="ghost"
              size="xs"
              color="error"
              icon="i-lucide-trash-2"
              @click="deleteProvider(row.original)"
            />
          </div>
        </template>
      </UTable>
    </template>
  </div>
</template>
