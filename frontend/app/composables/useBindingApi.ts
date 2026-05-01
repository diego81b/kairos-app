import type { AgentPluginBinding, CreateBindingPayload, UpdateBindingPayload } from '~/types'

export function useBindingApi() {
  const api = useApi()

  async function listBindings(agentId: string): Promise<AgentPluginBinding[]> {
    const res = await api.get<{ success: boolean; data: AgentPluginBinding[] }>(`/agents/${agentId}/bindings`)
    return res.data ?? []
  }

  async function createBinding(agentId: string, payload: CreateBindingPayload): Promise<AgentPluginBinding> {
    const res = await api.post<{ success: boolean; data: AgentPluginBinding }>(`/agents/${agentId}/bindings`, payload)
    return res.data
  }

  async function updateBinding(agentId: string, bindingId: string, payload: UpdateBindingPayload): Promise<AgentPluginBinding> {
    const res = await api.put<{ success: boolean; data: AgentPluginBinding }>(`/agents/${agentId}/bindings/${bindingId}`, payload)
    return res.data
  }

  async function deleteBinding(agentId: string, bindingId: string): Promise<void> {
    await api.del(`/agents/${agentId}/bindings/${bindingId}`)
  }

  return { listBindings, createBinding, updateBinding, deleteBinding }
}
