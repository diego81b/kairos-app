import type { ManagedUser, CreateUserPayload, UpdateUserPayload } from '~/types'

export function useUserApi() {
  const api = useApi()

  async function listUsers(): Promise<ManagedUser[]> {
    const res = await api.get<{ success: boolean; data: ManagedUser[] }>('/admin/users')
    return res.data ?? []
  }

  async function createUser(payload: CreateUserPayload): Promise<ManagedUser> {
    const res = await api.post<{ success: boolean; data: ManagedUser }>('/admin/users', payload)
    return res.data
  }

  async function updateUser(id: string, payload: UpdateUserPayload): Promise<ManagedUser> {
    const res = await api.patch<{ success: boolean; data: ManagedUser }>(`/admin/users/${id}`, payload)
    return res.data
  }

  async function deleteUser(id: string): Promise<void> {
    await api.del(`/admin/users/${id}`)
  }

  return { listUsers, createUser, updateUser, deleteUser }
}
