import type { IProviderPlugin, LLMResponse, PluginManifest } from '../../../domain/plugin/IPlugin'

export class OllamaProviderPlugin implements IProviderPlugin {
  readonly manifest: PluginManifest = {
    name: 'ollama-provider',
    version: '1.0.0',
    type: 'provider',
    source: 'built_in',
    entrypoint: 'built-in:OllamaProviderPlugin',
    providerKey: 'ollama',
    defaultModel: 'llama3',
    capabilities: ['chat', 'local'],
    pluginApiVersion: '1',
  }

  async call(
    prompt: string,
    model: string,
    _apiKey: string, // Ollama does not require an API key by default
    options: Record<string, unknown> = {},
  ): Promise<LLMResponse> {
    const baseUrl = (options.baseUrl as string | undefined) ?? 'http://localhost:11434'

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: 'user', content: prompt }],
        options: {
          temperature: (options.temperature as number | undefined) ?? 0.7,
          num_predict: (options.maxTokens as number | undefined) ?? 4096,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Ollama API error ${res.status}: ${err}`)
    }

    const json = await res.json() as {
      message: { content: string }
      prompt_eval_count?: number
      eval_count?: number
    }

    const inputTokens = json.prompt_eval_count ?? 0
    const outputTokens = json.eval_count ?? 0

    return {
      content: json.message.content,
      usage: { inputTokens, outputTokens, cost: 0 }, // local, no cost
    }
  }

  async getModels(_apiKey: string, baseUrl?: string): Promise<string[]> {
    try {
      const res = await fetch(`${baseUrl ?? 'http://localhost:11434'}/api/tags`)
      if (!res.ok) return []
      const json = await res.json() as { models: Array<{ name: string }> }
      return json.models.map((m) => m.name)
    } catch {
      return []
    }
  }

  async isAvailable(_apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl ?? 'http://localhost:11434'}/api/tags`)
      return res.ok
    } catch {
      return false
    }
  }
}
