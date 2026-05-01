import type { ProviderCredential, UpsertCredentialPayload } from '~/types'

export function useCredentialApi() {
  const api = useApi()

  async function listCredentials(): Promise<ProviderCredential[]> {
    const res = await api.get<{ success: boolean; data: ProviderCredential[] }>('/me/provider-credentials')
    return res.data ?? []
  }

  async function upsertCredential(payload: UpsertCredentialPayload): Promise<ProviderCredential> {
    const res = await api.post<{ success: boolean; data: ProviderCredential }>('/me/provider-credentials', payload)
    return res.data
  }

  async function deleteCredential(id: string): Promise<void> {
    await api.del(`/me/provider-credentials/${id}`)
  }

  return { listCredentials, upsertCredential, deleteCredential }
}
