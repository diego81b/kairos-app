import type { IProviderPlugin, LLMResponse, PluginManifest } from '../../../domain/plugin/IPlugin'

export class OpenRouterProviderPlugin implements IProviderPlugin {
  readonly manifest: PluginManifest = {
    name: 'openrouter-provider',
    version: '1.0.0',
    type: 'provider',
    source: 'built_in',
    entrypoint: 'built-in:OpenRouterProviderPlugin',
    providerKey: 'openrouter',
    defaultModel: 'mistralai/mistral-7b-instruct',
    capabilities: ['chat', 'fallback'],
    pluginApiVersion: '1',
  }

  async call(
    prompt: string,
    model: string,
    apiKey: string,
    options: Record<string, unknown> = {},
  ): Promise<LLMResponse> {
    const baseUrl = (options.baseUrl as string | undefined) ?? 'https://openrouter.ai/api'
    const maxTokens = (options.maxTokens as number | undefined) ?? 4096
    const temperature = (options.temperature as number | undefined) ?? 0.7

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://kairos.app',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenRouter API error ${res.status}: ${err}`)
    }

    const json = await res.json() as {
      choices: Array<{ message: { content: string } }>
      usage: { prompt_tokens: number; completion_tokens: number }
    }

    const inputTokens = json.usage.prompt_tokens
    const outputTokens = json.usage.completion_tokens

    return {
      content: json.choices[0].message.content,
      usage: { inputTokens, outputTokens, cost: 0 },
    }
  }

  async getModels(apiKey: string, baseUrl?: string): Promise<string[]> {
    try {
      const res = await fetch(`${baseUrl ?? 'https://openrouter.ai/api'}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) return []
      const json = await res.json() as { data: Array<{ id: string }> }
      return json.data.map((m) => m.id)
    } catch {
      return []
    }
  }

  async isAvailable(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl ?? 'https://openrouter.ai/api'}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      return res.ok
    } catch {
      return false
    }
  }
}
