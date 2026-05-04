<script setup lang="ts">
import { z } from 'zod'
import type { CreateUserPayload, UserRole } from '~/types'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [] }>()

const userApi = useUserApi()
const toast = useToast()
const loading = ref(false)
const { withOverlay } = useOverlay()

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'User', value: 'USER' },
  { label: 'Viewer', value: 'VIEWER' },
]

const schema = z
  .object({
    email: z.string().email('Email non valida'),
    name: z.string().optional(),
    role: z.enum(['ADMIN', 'USER', 'VIEWER']),
    password: z.string().min(6, 'Minimo 6 caratteri'),
    confirmPassword: z.string().min(6, 'Minimo 6 caratteri'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Le password non coincidono',
    path: ['confirmPassword'],
  })

const form = reactive<CreateUserPayload & { confirmPassword: string }>({
  email: '',
  name: '',
  role: 'USER',
  password: '',
  confirmPassword: '',
})

const errors = reactive<Record<string, string>>({})

function clearError(field: string) {
  delete errors[field]
}

function resetForm() {
  form.email = ''
  form.name = ''
  form.role = 'USER'
  form.password = ''
  form.confirmPassword = ''
  Object.keys(errors).forEach(k => delete errors[k])
}

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
      await userApi.createUser({
        email: form.email,
        password: form.password,
        name: form.name || undefined,
        role: form.role,
      })
      toast.add({ title: 'Utente creato', color: 'success' })
      resetForm()
      open.value = false
      emit('created')
    } catch {
      toast.add({ title: 'Errore nella creazione utente', color: 'error' })
    } finally {
      loading.value = false
    }
  })
}

watch(open, (val) => {
  if (!val) resetForm()
})
</script>

<template>
  <USlideover v-model:open="open" title="Aggiungi utente" side="right">
    <template #body>
      <div class="space-y-4 p-1">
        <UFormField label="Email" name="email" required :error="errors.email">
          <UInput v-model="form.email" type="email" placeholder="utente@esempio.com" class="w-full" @input="clearError('email')" />
        </UFormField>

        <UFormField label="Nome" name="name" :error="errors.name">
          <UInput v-model="form.name" placeholder="Nome e cognome (opzionale)" class="w-full" />
        </UFormField>

        <UFormField label="Ruolo" name="role" required :error="errors.role">
          <USelect v-model="form.role" :items="ROLES" value-key="value" label-key="label" class="w-full" />
        </UFormField>

        <UFormField label="Password temporanea" name="password" required :error="errors.password">
          <UInput v-model="form.password" type="password" placeholder="Minimo 6 caratteri" class="w-full" @input="clearError('password')" />
        </UFormField>

        <UFormField label="Conferma password" name="confirmPassword" required :error="errors.confirmPassword">
          <UInput v-model="form.confirmPassword" type="password" placeholder="Ripeti la password" class="w-full" @input="clearError('confirmPassword')" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton type="button" variant="ghost" @click="open = false">Annulla</UButton>
          <UButton type="button" :loading="loading" @click="handleSubmit">Crea utente</UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
