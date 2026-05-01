<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ProviderCredential, LlmProvider, UpsertCredentialPayload } from '~/types'

const credentialApi = useCredentialApi()
const providerApi = useProviderApi()
const toast = useToast()

const credentials = ref<ProviderCredential[]>([])
const providers = ref<LlmProvider[]>([])
const loading = ref(false)
const showModal = ref(false)
const loadingSave = ref(false)

const form = reactive<UpsertCredentialPayload>({
  providerId: '',
  apiKey: '',
})

const providerItems = computed(() =>
  providers.value.map(p => ({ label: p.displayName, value: p.id }))
)

async function load() {
  loading.value = true
  try {
    const [creds, provList] = await Promise.all([
      credentialApi.listCredentials(),
      providerApi.listProviders(),
    ])
    credentials.value = creds
    providers.value = provList
  } catch {
    toast.add({ title: 'Errore nel caricamento credenziali', color: 'error' })
  } finally {
    loading.value = false
  }
}

function openUpsert(credential?: ProviderCredential) {
  form.providerId = credential?.provider.id ?? ''
  form.apiKey = ''
  showModal.value = true
}

async function onSave() {
  if (!form.providerId || !form.apiKey) {
    toast.add({ title: 'Compila tutti i campi', color: 'warning' })
    return
  }
  loadingSave.value = true
  try {
    await credentialApi.upsertCredential(form)
    toast.add({ title: 'Credenziale salvata', color: 'success' })
    showModal.value = false
    form.providerId = ''
    form.apiKey = ''
    await load()
  } catch {
    toast.add({ title: 'Errore nel salvataggio', color: 'error' })
  } finally {
    loadingSave.value = false
  }
}

async function deleteCredential(id: string) {
  try {
    await credentialApi.deleteCredential(id)
    credentials.value = credentials.value.filter(c => c.id !== id)
    toast.add({ title: 'Credenziale eliminata', color: 'success' })
  } catch {
    toast.add({ title: 'Errore eliminazione', color: 'error' })
  }
}

const columns: TableColumn<ProviderCredential>[] = [
  {
    accessorKey: 'provider',
    header: 'Provider',
    cell: ({ row }) => row.original.provider.displayName,
  },
  {
    id: 'key',
    header: 'Chiave',
    cell: () => '••••••••••••••••',
  },
  {
    accessorKey: 'createdAt',
    header: 'Creata il',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('it-IT'),
  },
  { id: 'actions', header: '' },
]

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <p class="text-sm text-gray-500">Gestisci le tue API key per i provider LLM.</p>
      <UButton icon="i-lucide-plus" size="sm" @click="openUpsert()">Aggiungi API Key</UButton>
    </div>

    <UTable :data="credentials" :columns="columns" :loading="loading">
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-refresh-cw"
            @click="openUpsert(row.original)"
          >
            Aggiorna
          </UButton>
          <UButton
            variant="ghost"
            size="xs"
            color="error"
            icon="i-lucide-trash-2"
            @click="deleteCredential(row.original.id)"
          />
        </div>
      </template>
    </UTable>

    <UModal v-model:open="showModal" title="API Key">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Provider" name="providerId" required>
            <USelect
              v-model="form.providerId"
              :items="providerItems"
              value-key="value"
              label-key="label"
              placeholder="Seleziona provider"
              class="w-full"
            />
          </UFormField>

          <UFormField label="API Key" name="apiKey" required>
            <UInput v-model="form.apiKey" type="password" placeholder="sk-..." class="w-full" />
          </UFormField>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showModal = false">Annulla</UButton>
            <UButton :loading="loadingSave" @click="onSave">Salva</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
