<script setup lang="ts">
import type { Agent, AgentUserConfig, LlmProvider, UpsertAgentConfigPayload, AgentPluginBinding, Plugin } from '~/types'

const props = defineProps<{ agent: Agent }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const agentApi = useAgentApi()
const providerApi = useProviderApi()
const bindingApi = useBindingApi()
const toast = useToast()

const loading = ref(false)
const loadingSave = ref(false)
const providers = ref<LlmProvider[]>([])
const bindings = ref<AgentPluginBinding[]>([])
const userConfig = ref<AgentUserConfig | null>(null)

const form = reactive<UpsertAgentConfigPayload>({
  chosenProviderId: '',
  chosenModel: '',
  temperatureOverride: undefined,
  maxTokensOverride: undefined,
  enabled: true,
  output_format: '',
  output_example: '',
  after_output: '',
})

const providerItems = computed(() =>
  providers.value.map(p => ({ label: p.displayName, value: p.id }))
)

async function loadData() {
  loading.value = true
  try {
    const [config, provList, bindList] = await Promise.all([
      agentApi.getAgentConfig(props.agent.id),
      providerApi.listProviders(),
      bindingApi.listBindings(props.agent.id),
    ])
    userConfig.value = config.userConfig
    providers.value = provList
    bindings.value = bindList

    if (config.userConfig) {
      form.chosenProviderId = config.userConfig.chosenProvider?.id ?? ''
      form.chosenModel = config.userConfig.chosenModel ?? ''
      form.temperatureOverride = config.userConfig.temperatureOverride ?? undefined
      form.maxTokensOverride = config.userConfig.maxTokensOverride ?? undefined
      form.enabled = config.userConfig.enabled
      form.output_format = config.userConfig.output_format ?? ''
      form.output_example = config.userConfig.output_example ?? ''
      form.after_output = config.userConfig.after_output ?? ''
    }
  } catch {
    toast.add({ title: 'Errore nel caricamento configurazione', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function onSave() {
  if (!form.chosenProviderId) {
    toast.add({ title: 'Seleziona un provider', color: 'warning' })
    return
  }
  loadingSave.value = true
  try {
    await agentApi.upsertAgentConfig(props.agent.id, form)
    toast.add({ title: 'Configurazione salvata', color: 'success' })
    emit('saved')
    open.value = false
  } catch {
    toast.add({ title: 'Errore nel salvataggio', color: 'error' })
  } finally {
    loadingSave.value = false
  }
}

async function removeBinding(bindingId: string) {
  try {
    await bindingApi.deleteBinding(props.agent.id, bindingId)
    bindings.value = bindings.value.filter(b => b.id !== bindingId)
    toast.add({ title: 'Binding rimosso', color: 'success' })
  } catch {
    toast.add({ title: 'Errore nella rimozione binding', color: 'error' })
  }
}

watch(open, (val) => {
  if (val) loadData()
})
</script>

<template>
  <USlideover v-model:open="open" :title="agent.name" description="Configurazione agente" side="right">
    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-primary-500 size-6" />
      </div>

      <div v-else class="space-y-6 p-1">
        <!-- Sezione 1: Provider -->
        <div>
          <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Provider & Modello</h3>
          <div class="space-y-3">
            <UFormField label="Provider" name="chosenProviderId">
              <USelect
                v-model="form.chosenProviderId"
                :items="providerItems"
                value-key="value"
                label-key="label"
                placeholder="Seleziona provider"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Modello" name="chosenModel">
              <UInput v-model="form.chosenModel" placeholder="es. claude-sonnet-4-6" class="w-full" />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Temperature" name="temperatureOverride">
                <UInput v-model.number="form.temperatureOverride" type="number" :min="0" :max="2" :step="0.1" placeholder="0.7" class="w-full" />
              </UFormField>

              <UFormField label="Max Tokens" name="maxTokensOverride">
                <UInput v-model.number="form.maxTokensOverride" type="number" :min="1" placeholder="4096" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Abilitato">
              <UToggle v-model="form.enabled" />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Sezione 2: Override prompt -->
        <div>
          <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Override prompt</h3>
          <div class="space-y-3">
            <UFormField label="Output Format" name="output_format">
              <UTextarea v-model="form.output_format" :placeholder="agent.output_format || 'Eredita dal default agente'" :rows="3" class="w-full" />
            </UFormField>

            <UFormField label="Output Example" name="output_example">
              <UTextarea v-model="form.output_example" :placeholder="agent.output_example || 'Eredita dal default agente'" :rows="3" class="w-full" />
            </UFormField>

            <UFormField label="After Output" name="after_output">
              <UTextarea v-model="form.after_output" :placeholder="agent.after_output || 'Eredita dal default agente'" :rows="2" class="w-full" />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Sezione 3: Binding plugin -->
        <div>
          <h3 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Plugin binding</h3>
          <div v-if="bindings.length === 0" class="py-3 text-sm text-gray-400">
            Nessun binding configurato.
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="b in bindings"
              :key="b.id"
              class="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <span class="text-sm">{{ b.plugin.name }}</span>
              <UButton
                variant="ghost"
                size="xs"
                color="error"
                icon="i-lucide-trash-2"
                @click="removeBinding(b.id)"
              />
            </li>
          </ul>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" @click="open = false">Annulla</UButton>
          <UButton :loading="loadingSave" @click="onSave">Salva</UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
