export interface LlmProvider {
  id: string
  key: string
  displayName: string
  baseUrl?: string
  enabled: boolean
  metadata?: Record<string, unknown>
}

export interface CreateProviderPayload {
  key: string
  displayName: string
  baseUrl?: string
  enabled?: boolean
}

export interface UpdateProviderPayload {
  displayName?: string
  baseUrl?: string
  enabled?: boolean
}

export interface ProviderCredential {
  id: string
  provider: Pick<LlmProvider, 'id' | 'key' | 'displayName'>
  createdAt: string
}

export interface UpsertCredentialPayload {
  providerId: string
  apiKey: string
}
