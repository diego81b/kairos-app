<script setup lang="ts">
import { z } from 'zod'
import type { ManagedUser, UpdateUserPayload, UserRole } from '~/types'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ user: ManagedUser }>()
const emit = defineEmits<{ updated: [] }>()

const userApi = useUserApi()
const toast = useToast()
const loading = ref(false)

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

watch(() => props.user, (user) => {
  form.name = user.name ?? ''
  form.role = user.role
})

async function onSubmit() {
  loading.value = true
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
}
</script>

<template>
  <USlideover v-model:open="open" :title="`Modifica: ${user.email}`" side="right">
    <template #body>
      <UForm :schema="schema" :state="form" class="space-y-4 p-1" @submit="onSubmit">
        <UFormField label="Nome" name="name">
          <UInput v-model="form.name" placeholder="Nome e cognome (opzionale)" class="w-full" />
        </UFormField>

        <UFormField label="Ruolo" name="role" required>
          <USelect v-model="form.role" :items="ROLES" value-key="value" label-key="label" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" @click="open = false">Annulla</UButton>
          <UButton type="submit" :loading="loading">Salva</UButton>
        </div>
      </UForm>
    </template>
  </USlideover>
</template>
