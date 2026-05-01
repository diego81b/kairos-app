import type { Agent, CreateAgentPayload, UpsertAgentConfigPayload, AgentUserConfig } from '~/types'

export function useAgentApi() {
  const api = useApi()

  async function listAgents(): Promise<Agent[]> {
    const res = await api.get<{ success: boolean; data: Agent[] }>('/me/agents')
    return res.data ?? []
  }

  async function listAllAgents(): Promise<Agent[]> {
    const res = await api.get<{ success: boolean; data: Agent[] }>('/me/agents/all')
    return res.data ?? []
  }

  async function createAgent(payload: CreateAgentPayload): Promise<Agent> {
    const res = await api.post<{ success: boolean; data: Agent }>('/me/agents', payload)
    return res.data
  }

  async function getAgentConfig(agentId: string): Promise<{ agent: Agent; userConfig: AgentUserConfig | null }> {
    const res = await api.get<{ success: boolean; data: { agent: Agent; userConfig: AgentUserConfig | null } }>(`/me/agents/${agentId}/config`)
    return res.data
  }

  async function upsertAgentConfig(agentId: string, payload: UpsertAgentConfigPayload): Promise<AgentUserConfig> {
    const res = await api.put<{ success: boolean; data: AgentUserConfig }>(`/me/agents/${agentId}/config`, payload)
    return res.data
  }

  return { listAgents, listAllAgents, createAgent, getAgentConfig, upsertAgentConfig }
}
