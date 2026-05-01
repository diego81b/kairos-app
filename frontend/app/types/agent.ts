export type AgentType = 'pm' | 'architect' | 'reviewer' | 'tester' | 'planner'
export type AgentVisibility = 'global' | 'private'

export interface AgentUserConfig {
  id: string
  chosenProvider: { id: string; key: string; displayName: string } | null
  chosenModel: string | null
  temperatureOverride: number | null
  maxTokensOverride: number | null
  config: Record<string, unknown> | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Agent {
  id: string
  name: string
  agentType: AgentType
  description?: string
  systemPrompt?: string
  output_format?: string
  output_example?: string
  after_output?: string
  visibility: AgentVisibility
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  userConfig?: AgentUserConfig | null
}

export interface CreateAgentPayload {
  name: string
  agentType: AgentType
  description?: string
  systemPrompt?: string
  output_format?: string
  output_example?: string
  after_output?: string
  isActive?: boolean
}

export interface UpsertAgentConfigPayload {
  chosenProviderId: string
  chosenModel?: string
  temperatureOverride?: number
  maxTokensOverride?: number
  config?: Record<string, unknown>
  enabled?: boolean
  output_format?: string
  output_example?: string
  after_output?: string
}
