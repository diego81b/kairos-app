export interface Plugin {
  id: string
  name: string
  type: string
  entrypoint: string
}

export interface AgentPluginBinding {
  id: string
  plugin: Plugin
  config?: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

export interface CreateBindingPayload {
  pluginId: string
  config?: Record<string, unknown>
}

export interface UpdateBindingPayload {
  config?: Record<string, unknown>
  isActive?: boolean
}
