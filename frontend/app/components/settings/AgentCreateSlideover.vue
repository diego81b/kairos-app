<script setup lang="ts">
import { z } from 'zod'
import type { CreateAgentPayload } from '~/types'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()

const agentApi = useAgentApi()
const toast = useToast()
const loading = ref(false)
const formRef = useTemplateRef('formRef')

const AGENT_TYPES = [
  { label: 'PM', value: 'pm' },
  { label: 'Architect', value: 'architect' },
  { label: 'Reviewer', value: 'reviewer' },
  { label: 'Tester', value: 'tester' },
  { label: 'Planner', value: 'planner' },
]

const schema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  agentType: z.enum(['pm', 'architect', 'reviewer', 'tester', 'planner']),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  output_format: z.string().optional(),
  output_example: z.string().optional(),
  after_output: z.string().optional(),
})

const form = reactive<CreateAgentPayload>({
  name: '',
  agentType: 'pm',
  description: '',
  systemPrompt: '',
  output_format: '',
  output_example: '',
  after_output: '',
})

function resetForm() {
  form.name = ''
  form.agentType = 'pm'
  form.description = ''
  form.systemPrompt = ''
  form.output_format = ''
  form.output_example = ''
  form.after_output = ''
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await agentApi.createAgent(form)
    toast.add({ title: 'Agente creato', color: 'success' })
    resetForm()
    emit('created')
  } catch {
    toast.add({ title: 'Errore nella creazione', color: 'error' })
  } finally {
    loading.value = false
  }
}

watch(open, (val) => {
  if (!val) resetForm()
})
</script>

<template>
  <USlideover v-model:open="open" title="Nuovo agente" side="right">
    <template #body>
      <UForm ref="formRef" :schema="schema" :state="form" class="space-y-4 p-1">
        <UFormField label="Nome" name="name" required>
          <UInput v-model="form.name" placeholder="es. Il mio PM Agent" class="w-full" />
        </UFormField>

        <UFormField label="Tipo" name="agentType" required>
          <USelect v-model="form.agentType" :items="AGENT_TYPES" value-key="value" label-key="label" class="w-full" />
        </UFormField>

        <UFormField label="Descrizione" name="description">
          <UTextarea v-model="form.description" placeholder="Descrizione opzionale" :rows="2" class="w-full" />
        </UFormField>

        <UFormField label="System Prompt" name="systemPrompt">
          <UTextarea v-model="form.systemPrompt" placeholder="Istruzioni di sistema per l'agente" :rows="4" class="w-full" />
        </UFormField>

        <UFormField label="Output Format" name="output_format">
          <UTextarea v-model="form.output_format" placeholder="Formato atteso dell'output" :rows="3" class="w-full" />
        </UFormField>

        <UFormField label="Output Example" name="output_example">
          <UTextarea v-model="form.output_example" placeholder="Esempio di output" :rows="3" class="w-full" />
        </UFormField>

        <UFormField label="After Output" name="after_output">
          <UTextarea v-model="form.after_output" placeholder="Istruzioni post-output (solo orchestrazione)" :rows="2" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton type="button" variant="ghost" @click="open = false">Annulla</UButton>
          <UButton type="button" :loading="loading" @click="handleSubmit">Crea agente</UButton>
        </div>
      </UForm>
    </template>
  </USlideover>
</template>
