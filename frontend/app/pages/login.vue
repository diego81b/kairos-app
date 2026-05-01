<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-primary-600">KAIROS</h1>
          <p class="mt-1 text-sm text-gray-500">Sign in to your workspace</p>
        </div>
      </template>

      <UForm :schema="schema" :state="form" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput v-model="form.email" type="email" placeholder="you@example.com" class="w-full" />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput v-model="form.password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>

        <UButton type="submit" block :loading="loading">
          Sign in
        </UButton>
      </UForm>

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

async function onSubmit() {
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
