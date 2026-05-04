<script setup lang="ts">
import { z } from 'zod'
import type { ManagedUser, UpdateUserPayload, UserRole } from '~/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ user: ManagedUser }>()
const emit = defineEmits<{ updated: [] }>()

const userApi = useUserApi()
const toast = useToast()
const loading = ref(false)
const { withOverlay } = useOverlay()

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'User', value: 'USER' },
  { label: 'Viewer', value: 'VIEWER' },
]

const schema = z.object({
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'USER', 'VIEWER']),
})

const form = reactive<UpdateUserPayload>({
  name: props.user.name ?? '',
  role: props.user.role,
})

const errors = reactive<Record<string, string>>({})

watch(() => props.user, (user) => {
  form.name = user.name ?? ''
  form.role = user.role
  Object.keys(errors).forEach(k => delete errors[k])
})

async function handleSubmit() {
  Object.keys(errors).forEach(k => delete errors[k])
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0])
      if (field && !errors[field]) errors[field] = issue.message
    }
    return
  }

  loading.value = true
  await withOverlay(async () => {
    try {
      await userApi.updateUser(props.user.id, {
        name: form.name || undefined,
        role: form.role,
      })
      toast.add({ title: 'Utente aggiornato', color: 'success' })
      open.value = false
      emit('updated')
    } catch {
      toast.add({ title: 'Errore aggiornamento utente', color: 'error' })
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <USlideover v-model:open="open" :title="`Modifica: ${user.email}`" side="right">
    <template #body>
      <div class="space-y-4 p-1">
        <UFormField label="Nome" name="name" :error="errors.name">
          <UInput v-model="form.name" placeholder="Nome e cognome (opzionale)" class="w-full" />
        </UFormField>

        <UFormField label="Ruolo" name="role" required :error="errors.role">
          <USelect v-model="form.role" :items="ROLES" value-key="value" label-key="label" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton type="button" variant="ghost" @click="open = false">Annulla</UButton>
          <UButton type="button" :loading="loading" @click="handleSubmit">Salva</UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
