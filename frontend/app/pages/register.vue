<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-2xl font-bold text-primary-600">KAIROS</h1>
          <p class="mt-1 text-sm text-gray-500">Create your account</p>
        </div>
      </template>

      <UForm :schema="schema" :state="form" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name">
          <UInput v-model="form.name" placeholder="Your name" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput v-model="form.email" type="email" placeholder="you@example.com" class="w-full" />
        </UFormField>

        <UFormField label="Password" name="password">
          <UInput v-model="form.password" type="password" placeholder="••••••••" class="w-full" />
        </UFormField>

        <UButton type="submit" block :loading="loading">
          Create account
        </UButton>
      </UForm>

      <template #footer>
        <p class="text-center text-sm text-gray-500">
          Already have an account?
          <UButton to="/login" variant="link" size="sm" class="p-0">Sign in</UButton>
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
  name: z.string().optional(),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
})

const form = reactive({ name: '', email: '', password: '' })

async function onSubmit() {
  loading.value = true
  try {
    await auth.register(form.email, form.password, form.name || undefined)
    await navigateTo('/board')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.add({ title: 'Registration failed', description: err?.data?.message ?? 'Please try again', color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
