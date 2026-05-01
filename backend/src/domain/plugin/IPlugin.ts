// Runtime contracts for the plugin system.
// All plugin implementations must satisfy the relevant interface here.

import type { ResolvedProvider } from '../../shared/types'

// ─── Shared ──────────────────────────────────────────────────────────────────

export interface LLMResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    /** Estimated cost in USD; 0 if provider does not report it */
    cost: number
  }
  metadata?: Record<string, unknown>
}

export interface PluginManifest {
  name: string
  version: string
  /** 'provider' | 'agent' | 'tool' */
  type: string
  /** 'built_in' | 'local_package' */
  source: string
  /** Entrypoint used by PluginDiscoveryService: 'built-in:<ClassName>' or 'local:<package>' */
  entrypoint: string
  /** Provider key this plugin targets (provider plugins only) */
  providerKey?: string
  defaultModel?: string
  capabilities?: string[]
  /** Semantic version of the Plugin API this manifest targets */
  pluginApiVersion: string
}

// ─── Provider Plugin ──────────────────────────────────────────────────────────

export interface IProviderPlugin {
  readonly manifest: PluginManifest

  /**
   * Make an LLM call with the given prompt and model.
   * @param prompt - The full prompt string
   * @param model  - Model identifier; caller applies fallback resolution before calling
   * @param apiKey - Decrypted API key for this user/provider pair
   * @param options - Optional overrides (temperature, maxTokens, baseUrl, ...)
   */
  call(
    prompt: string,
    model: string,
    apiKey: string,
    options?: Record<string, unknown>,
  ): Promise<LLMResponse>

  /** Return available models from this provider. Empty array if not supported. */
  getModels(apiKey: string, baseUrl?: string): Promise<string[]>

  /** Validate that the provider API is reachable with the given key. */
  isAvailable(apiKey: string, baseUrl?: string): Promise<boolean>
}

// ─── Agent Plugin ─────────────────────────────────────────────────────────────

export interface AgentContext {
  issue: Record<string, unknown>
  previousOutputs?: Record<string, unknown>
  feedback?: string
}

export interface ParsedAgentOutput {
  valid: boolean
  errors: string[]
  data: Record<string, unknown>
}

export interface IAgentPlugin {
  readonly manifest: PluginManifest

  buildPrompt(context: AgentContext): string
  parseOutput(raw: string): ParsedAgentOutput
  validateOutput(parsed: ParsedAgentOutput): { valid: boolean; errors: string[] }
  postProcess(parsed: ParsedAgentOutput, context: AgentContext): ParsedAgentOutput
}

// ─── Tool Plugin ──────────────────────────────────────────────────────────────

export interface IToolPlugin {
  readonly manifest: PluginManifest

  /** Returns the JSON Schema describing expected input */
  getSchema(): Record<string, unknown>
  validateInput(input: Record<string, unknown>): { valid: boolean; errors: string[] }
  execute(input: Record<string, unknown>, context?: Record<string, unknown>): Promise<Record<string, unknown>>
}

// ─── Registry types ───────────────────────────────────────────────────────────

export type AnyPlugin = IProviderPlugin | IAgentPlugin | IToolPlugin

export interface IPluginRegistry {
  getProviderPlugin(entrypoint: string): IProviderPlugin | undefined
  getAgentPlugin(entrypoint: string): IAgentPlugin | undefined
  getToolPlugin(entrypoint: string): IToolPlugin | undefined
  listProviderPlugins(): IProviderPlugin[]
}

export interface IProviderResolutionService {
  /** Resolve the full provider context for an agent execution. */
  resolve(agentId: string, userId: string): Promise<ResolvedProvider>
}
