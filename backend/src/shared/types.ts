export type UserRole = 'ADMIN' | 'USER' | 'VIEWER'

export type IssueSource = 'jira' | 'github' | 'gitlab' | 'manual'

export type KanbanColumn = 'backlog' | 'pm' | 'architect' | 'review' | 'test' | 'release'

export type IssueStatus = 'backlog' | 'in_progress' | 'done' | 'stuck'

export type AgentType = 'pm' | 'architect' | 'reviewer' | 'tester' | 'planner'

export type AgentOutputStatus = 'pending' | 'approved' | 'rejected' | 'synced'

export type LLMProvider = 'anthropic' | 'openrouter' | 'openai' | 'ollama'

// Plugin system types
export type PluginType = 'provider' | 'agent' | 'tool'
export type PluginSource = 'built_in' | 'local_package'
export type PluginStatus = 'active' | 'deprecated' | 'beta' | 'invalid'

// Model resolution policy: binding (L1) -> plugin.defaultModel (L2) -> provider metadata.defaultModel (L3)
export type ModelResolutionLevel = 'binding' | 'plugin_default' | 'provider_default'

export type ResolvedProvider = {
  pluginEntrypoint: string
  providerKey: string
  model: string
  modelResolutionLevel: ModelResolutionLevel
  credentialId: string
  /** Decrypted API key; populated by ProviderResolutionService at runtime */
  apiKey: string
  /** Resolved base URL (credential override > provider default) */
  baseUrl?: string
  /** Per-binding runtime config (temperature overrides, etc.) */
  bindingConfig?: Record<string, unknown>
}

export type EnabledAgents = {
  pm: boolean
  architect: boolean
  implementer: boolean
  reviewer: boolean
  tester: boolean
  release: boolean
}

export const DEFAULT_ENABLED_AGENTS: EnabledAgents = {
  pm: true,
  architect: true,
  implementer: false,
  reviewer: true,
  tester: true,
  release: true,
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  'backlog',
  'pm',
  'architect',
  'review',
  'test',
  'release',
]
