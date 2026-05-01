import type { IProviderPlugin, LLMResponse, PluginManifest } from '../../../domain/plugin/IPlugin'

export class AnthropicProviderPlugin implements IProviderPlugin {
  readonly manifest: PluginManifest = {
    name: 'anthropic-provider',
    version: '1.0.0',
    type: 'provider',
    source: 'built_in',
    entrypoint: 'built-in:AnthropicProviderPlugin',
    providerKey: 'anthropic',
    defaultModel: 'claude-sonnet-4-5',
    capabilities: ['chat', 'streaming'],
    pluginApiVersion: '1',
  }

  async call(
    prompt: string,
    model: string,
    apiKey: string,
    options: Record<string, unknown> = {},
  ): Promise<LLMResponse> {
    const baseUrl = (options.baseUrl as string | undefined) ?? 'https://api.anthropic.com'
    const maxTokens = (options.maxTokens as number | undefined) ?? 4096
    const temperature = (options.temperature as number | undefined) ?? 0.7

    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
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
      throw new Error(`Anthropic API error ${res.status}: ${err}`)
    }

    const json = await res.json() as {
      content: Array<{ text: string }>
      usage: { input_tokens: number; output_tokens: number }
    }

    const inputTokens = json.usage.input_tokens
    const outputTokens = json.usage.output_tokens

    return {
      content: json.content.map((c) => c.text).join(''),
      usage: {
        inputTokens,
        outputTokens,
        cost: this._estimateCost(model, inputTokens, outputTokens),
      },
    }
  }

  async getModels(_apiKey: string): Promise<string[]> {
    // Return well-known models; Anthropic does not expose a public list endpoint
    return [
      'claude-opus-4-5',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
    ]
  }

  async isAvailable(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const url = `${baseUrl ?? 'https://api.anthropic.com'}/v1/models`
      const res = await fetch(url, {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      })
      return res.status !== 401 && res.status !== 403
    } catch {
      return false
    }
  }

  // Basic per-token cost estimate (USD) – update as pricing changes
  private _estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rates: Record<string, { in: number; out: number }> = {
      'claude-opus-4-5': { in: 0.000015, out: 0.000075 },
      'claude-sonnet-4-5': { in: 0.000003, out: 0.000015 },
      'claude-haiku-4-5': { in: 0.00000025, out: 0.00000125 },
    }
    const r = rates[model] ?? rates['claude-sonnet-4-5']
    return inputTokens * r.in + outputTokens * r.out
  }
}
