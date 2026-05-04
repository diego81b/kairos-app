<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-primary-600">KAIROS</h1>
          <p class="mt-1 text-sm text-gray-500">Sign in to your workspace</p>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormField label="Email" :error="errors.email">
          <UInput v-model="form.email" type="email" placeholder="you@example.com" class="w-full" @input="delete errors.email" />
        </UFormField>

        <UFormField label="Password" :error="errors.password">
          <UInput v-model="form.password" type="password" placeholder="••••••••" class="w-full" @input="delete errors.password" />
        </UFormField>

        <UButton type="submit" block :loading="loading" :disabled="loading">
          Sign in
        </UButton>
      </form>

      <template #footer>
        <p class="text-center text-sm text-gray-500">
          No account?
          <UButton to="/register" variant="link" size="sm" class="p-0">Register</UButton>
        </p>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'

definePageMeta({ middleware: 'auth', layout: false })

const auth = useAuthStore()
const toast = useToast()
const loading = ref(false)

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
})

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})

async function onSubmit() {
  Object.keys(errors).forEach(k => delete (errors as Record<string, string>)[k])
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0])
      if (field && !(errors as Record<string, string>)[field]) {
        (errors as Record<string, string>)[field] = issue.message
      }
    }
    return
  }

  loading.value = true
  try {
    await auth.login(form.email, form.password)
    await navigateTo('/home')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: 'Login failed', description: err?.data?.message ?? 'Invalid credentials', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
