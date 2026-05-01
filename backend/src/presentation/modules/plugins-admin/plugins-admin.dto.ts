// ─── Provider DTOs ────────────────────────────────────────────────────────────

export interface CreateProviderDto {
  key: string
  displayName: string
  baseUrl?: string
  metadata?: Record<string, unknown>
  enabled?: boolean
}

export interface UpdateProviderDto {
  displayName?: string
  baseUrl?: string
  metadata?: Record<string, unknown>
  enabled?: boolean
}

// ─── Credential DTOs ──────────────────────────────────────────────────────────

export interface UpsertCredentialDto {
  providerId: string
  apiKey: string
  endpointOverride?: string
  extra?: Record<string, unknown>
  isActive?: boolean
}

// ─── Binding DTOs ─────────────────────────────────────────────────────────────

export interface CreateBindingDto {
  pluginId: string
  modelName?: string
  priority?: number
  enabled?: boolean
  config?: Record<string, unknown>
}

export interface UpdateBindingDto {
  modelName?: string
  priority?: number
  enabled?: boolean
  config?: Record<string, unknown>
}
