import { Injectable } from '@nestjs/common'
import type { IPluginRegistry, IProviderPlugin, IAgentPlugin, IToolPlugin } from '../../domain/plugin/IPlugin'
import { AnthropicProviderPlugin } from './providers/AnthropicProviderPlugin'
import { OpenAIProviderPlugin } from './providers/OpenAIProviderPlugin'
import { OpenRouterProviderPlugin } from './providers/OpenRouterProviderPlugin'
import { OllamaProviderPlugin } from './providers/OllamaProviderPlugin'

/**
 * In-memory registry of all built-in plugins.
 * Keyed by plugin entrypoint string (e.g. 'built-in:AnthropicProviderPlugin').
 */
@Injectable()
export class PluginRegistry implements IPluginRegistry {
  private readonly providerPlugins = new Map<string, IProviderPlugin>([
    ['built-in:AnthropicProviderPlugin', new AnthropicProviderPlugin()],
    ['built-in:OpenAIProviderPlugin', new OpenAIProviderPlugin()],
    ['built-in:OpenRouterProviderPlugin', new OpenRouterProviderPlugin()],
    ['built-in:OllamaProviderPlugin', new OllamaProviderPlugin()],
  ])

  // Agent and tool plugins will be added as they are implemented
  private readonly agentPlugins = new Map<string, IAgentPlugin>()
  private readonly toolPlugins = new Map<string, IToolPlugin>()

  getProviderPlugin(entrypoint: string): IProviderPlugin | undefined {
    return this.providerPlugins.get(entrypoint)
  }

  getAgentPlugin(entrypoint: string): IAgentPlugin | undefined {
    return this.agentPlugins.get(entrypoint)
  }

  getToolPlugin(entrypoint: string): IToolPlugin | undefined {
    return this.toolPlugins.get(entrypoint)
  }

  listProviderPlugins(): IProviderPlugin[] {
    return [...this.providerPlugins.values()]
  }
}
