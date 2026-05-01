import type { LlmProvider, CreateProviderPayload, UpdateProviderPayload } from '~/types'

export function useProviderApi() {
  const api = useApi()

  async function listProviders(): Promise<LlmProvider[]> {
    const res = await api.get<{ success: boolean; data: LlmProvider[] }>('/admin/providers')
    return res.data ?? []
  }

  async function createProvider(payload: CreateProviderPayload): Promise<LlmProvider> {
    const res = await api.post<{ success: boolean; data: LlmProvider }>('/admin/providers', payload)
    return res.data
  }

  async function updateProvider(id: string, payload: UpdateProviderPayload): Promise<LlmProvider> {
    const res = await api.put<{ success: boolean; data: LlmProvider }>(`/admin/providers/${id}`, payload)
    return res.data
  }

  async function deleteProvider(id: string): Promise<void> {
    await api.del(`/admin/providers/${id}`)
  }

  async function testProvider(id: string): Promise<{ success: boolean; message?: string }> {
    const res = await api.post<{ success: boolean; message?: string }>(`/admin/providers/${id}/test`)
    return res
  }

  return { listProviders, createProvider, updateProvider, deleteProvider, testProvider }
}
