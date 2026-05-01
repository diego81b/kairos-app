<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ManagedUser } from '~/types'

definePageMeta({ middleware: ['auth', 'admin'] })

const userApi = useUserApi()
const toast = useToast()

const users = ref<ManagedUser[]>([])
const loading = ref(false)
const showCreate = ref(false)
const showEdit = ref(false)
const showDeleteConfirm = ref(false)
const selectedUser = ref<ManagedUser | null>(null)
const deletingId = ref<string | null>(null)

const ROLE_COLORS: Record<string, 'error' | 'primary' | 'neutral'> = {
  ADMIN: 'error',
  USER: 'primary',
  VIEWER: 'neutral',
}

async function load() {
  loading.value = true
  try {
    users.value = await userApi.listUsers()
  } catch {
    toast.add({ title: 'Errore nel caricamento utenti', color: 'error' })
  } finally {
    loading.value = false
  }
}

function openEdit(user: ManagedUser) {
  selectedUser.value = user
  showEdit.value = true
}

function openDeleteConfirm(user: ManagedUser) {
  selectedUser.value = user
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!selectedUser.value) return
  deletingId.value = selectedUser.value.id
  try {
    await userApi.deleteUser(selectedUser.value.id)
    users.value = users.value.filter(u => u.id !== selectedUser.value!.id)
    toast.add({ title: 'Utente eliminato', color: 'success' })
    showDeleteConfirm.value = false
    selectedUser.value = null
  } catch {
    toast.add({ title: 'Errore eliminazione utente', color: 'error' })
  } finally {
    deletingId.value = null
  }
}

const columns: TableColumn<ManagedUser>[] = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'name', header: 'Nome', cell: ({ row }) => row.original.name ?? '-' },
  { id: 'role', header: 'Ruolo' },
  {
    accessorKey: 'createdAt',
    header: 'Creato il',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('it-IT'),
  },
  { id: 'actions', header: '' },
]

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">Gestione Utenti</h1>
        <p class="mt-1 text-sm text-gray-500">Aggiungi utenti e assegna ruoli al workspace.</p>
      </div>
      <UButton icon="i-lucide-user-plus" size="sm" @click="showCreate = true">
        Aggiungi utente
      </UButton>
    </div>

    <UTable :data="users" :columns="columns" :loading="loading">
      <template #role-cell="{ row }">
        <UBadge :color="ROLE_COLORS[row.original.role] ?? 'neutral'" variant="subtle" size="sm">
          {{ row.original.role }}
        </UBadge>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton
            variant="ghost"
            size="xs"
            icon="i-lucide-pencil"
            @click="openEdit(row.original)"
          />
          <UButton
            variant="ghost"
            size="xs"
            color="error"
            icon="i-lucide-trash-2"
            @click="openDeleteConfirm(row.original)"
          />
        </div>
      </template>
    </UTable>

    <UserCreateSlideover v-model:open="showCreate" @created="load" />

    <UserEditSlideover
      v-if="selectedUser"
      v-model:open="showEdit"
      :user="selectedUser"
      @updated="load"
    />

    <UModal v-model:open="showDeleteConfirm" title="Elimina utente">
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Sei sicuro di voler eliminare <strong>{{ selectedUser?.email }}</strong>? L'azione è irreversibile.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <UButton variant="ghost" @click="showDeleteConfirm = false">Annulla</UButton>
          <UButton color="error" :loading="!!deletingId" @click="confirmDelete">Elimina</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
