import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { LlmProviderEntity } from '../../../domain/entities/LlmProviderEntity'
import { PluginEntity } from '../../../domain/entities/PluginEntity'

// Static definition of built-in providers seeded at bootstrap.
// This seeder is idempotent: it upserts by `key` (provider) and `name+version` (plugin),
// so it can be run multiple times without duplicating data.
const BUILT_IN_PROVIDERS: Array<{
  key: string
  displayName: string
  baseUrl?: string
  metadata?: Record<string, unknown>
}> = [
  {
    key: 'anthropic',
    displayName: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    metadata: { defaultModel: 'claude-sonnet-4-5', docsUrl: 'https://docs.anthropic.com' },
  },
  {
    key: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    metadata: { defaultModel: 'gpt-4o', docsUrl: 'https://platform.openai.com/docs' },
  },
  {
    key: 'openrouter',
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api',
    metadata: { defaultModel: 'mistralai/mistral-7b-instruct', docsUrl: 'https://openrouter.ai/docs' },
  },
  {
    key: 'ollama',
    displayName: 'Ollama (local)',
    baseUrl: 'http://localhost:11434',
    metadata: { defaultModel: 'llama3', docsUrl: 'https://ollama.com/docs' },
  },
]

const BUILT_IN_PLUGINS: Array<{
  name: string
  version: string
  type: 'provider' | 'agent' | 'tool'
  providerKey: string
  entrypoint: string
  defaultModel: string
  manifest?: Record<string, unknown>
}> = [
  {
    name: 'anthropic-provider',
    version: '1.0.0',
    type: 'provider',
    providerKey: 'anthropic',
    entrypoint: 'built-in:AnthropicProviderPlugin',
    defaultModel: 'claude-sonnet-4-5',
    manifest: { capabilities: ['chat', 'streaming'], apiVersion: '2024-02-01' },
  },
  {
    name: 'openai-provider',
    version: '1.0.0',
    type: 'provider',
    providerKey: 'openai',
    entrypoint: 'built-in:OpenAIProviderPlugin',
    defaultModel: 'gpt-4o',
    manifest: { capabilities: ['chat', 'streaming', 'function_calling'] },
  },
  {
    name: 'openrouter-provider',
    version: '1.0.0',
    type: 'provider',
    providerKey: 'openrouter',
    entrypoint: 'built-in:OpenRouterProviderPlugin',
    defaultModel: 'mistralai/mistral-7b-instruct',
    manifest: { capabilities: ['chat', 'fallback'] },
  },
  {
    name: 'ollama-provider',
    version: '1.0.0',
    type: 'provider',
    providerKey: 'ollama',
    entrypoint: 'built-in:OllamaProviderPlugin',
    defaultModel: 'llama3',
    manifest: { capabilities: ['chat', 'local'] },
  },
]

export class BuiltInPluginSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Upsert providers
    const providerMap = new Map<string, LlmProviderEntity>()
    for (const p of BUILT_IN_PROVIDERS) {
      let entity = await em.findOne(LlmProviderEntity, { key: p.key })
      if (!entity) {
        entity = new LlmProviderEntity()
        entity.key = p.key
        entity.displayName = p.displayName
        entity.baseUrl = p.baseUrl
        entity.metadata = p.metadata
        entity.enabled = true
        em.persist(entity)
      } else {
        entity.displayName = p.displayName
        entity.baseUrl = p.baseUrl
        entity.metadata = p.metadata
      }
      providerMap.set(p.key, entity)
    }
    await em.flush()

    // Upsert plugins
    for (const p of BUILT_IN_PLUGINS) {
      const provider = providerMap.get(p.providerKey)
      if (!provider) continue

      let plugin = await em.findOne(PluginEntity, { name: p.name, version: p.version })
      if (!plugin) {
        plugin = new PluginEntity()
        plugin.name = p.name
        plugin.version = p.version
        plugin.type = p.type
        plugin.source = 'built_in'
        plugin.provider = provider
        plugin.entrypoint = p.entrypoint
        plugin.defaultModel = p.defaultModel
        plugin.manifest = p.manifest
        plugin.enabled = true
        plugin.status = 'active'
        em.persist(plugin)
      } else {
        plugin.provider = provider
        plugin.entrypoint = p.entrypoint
        plugin.defaultModel = p.defaultModel
        plugin.manifest = p.manifest
      }
    }
    await em.flush()
  }
}
