import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@mikro-orm/nestjs'
import type { EntityRepository } from '@mikro-orm/core'
import { AgentPluginBindingEntity } from '../../domain/entities/AgentPluginBindingEntity'
import { LlmProviderCredentialsEntity } from '../../domain/entities/LlmProviderCredentialsEntity'
import type { IProviderResolutionService } from '../../domain/plugin/IPlugin'
import type { ModelResolutionLevel, ResolvedProvider } from '../../shared/types'
import { decrypt } from '../security/Encryption'
import { PluginAuditService } from './PluginAuditService'

/**
 * Resolves the full provider context for an agent execution.
 *
 * Model resolution order (first non-null wins):
 *   L1 — agent_plugin_bindings.model_name       (per-binding override)
 *   L2 — plugins.default_model                  (plugin default)
 *   L3 — llm_providers.metadata.defaultModel    (provider default)
 */
@Injectable()
export class ProviderResolutionService implements IProviderResolutionService {
  private readonly logger = new Logger(ProviderResolutionService.name)

  constructor(
    @InjectRepository(AgentPluginBindingEntity) private readonly bindingRepo: EntityRepository<AgentPluginBindingEntity>,
    @InjectRepository(LlmProviderCredentialsEntity) private readonly credentialRepo: EntityRepository<LlmProviderCredentialsEntity>,
    private readonly audit: PluginAuditService,
  ) {}

  async resolve(agentId: string, userId: string): Promise<ResolvedProvider> {
    // Load the highest-priority enabled provider binding for this agent
    const binding = await this.bindingRepo.findOne(
      { agent: agentId, enabled: true, plugin: { type: 'provider', enabled: true } },
      {
        populate: ['plugin', 'plugin.provider'] as const,
        orderBy: { priority: 'ASC' },
      },
    )

    if (!binding) {
      throw new NotFoundException(
        `No active provider plugin binding found for agent "${agentId}"`,
      )
    }

    const plugin = binding.plugin
    const provider = plugin.provider

    if (!provider) {
      throw new NotFoundException(
        `Plugin "${plugin.name}" has no associated provider`,
      )
    }

    if (!provider.enabled) {
      throw new NotFoundException(
        `Provider "${provider.key}" is disabled`,
      )
    }

    // ── 3-level model resolution ─────────────────────────────────────────────
    let model: string | undefined
    let modelResolutionLevel: ModelResolutionLevel

    if (binding.modelName) {
      model = binding.modelName
      modelResolutionLevel = 'binding'
    } else if (plugin.defaultModel) {
      model = plugin.defaultModel
      modelResolutionLevel = 'plugin_default'
    } else {
      const providerDefault = provider.metadata?.defaultModel as string | undefined
      if (!providerDefault) {
        throw new NotFoundException(
          `Cannot resolve a model for agent "${agentId}": no model defined at any fallback level`,
        )
      }
      model = providerDefault
      modelResolutionLevel = 'provider_default'
    }

    this.logger.debug(
      `Model resolved for agent=${agentId}: "${model}" via level="${modelResolutionLevel}"`,
    )

    // ── Credential resolution ────────────────────────────────────────────────
    const credential = await this.credentialRepo.findOne({
      provider: provider.id,
      user: userId,
      isActive: true,
    })

    if (!credential) {
      throw new NotFoundException(
        `No active credentials found for provider "${provider.key}" and user "${userId}"`,
      )
    }

    const decryptedApiKey = decrypt(credential.apiKey)

    // Endpoint: credential override > provider base_url > plugin default
    const resolvedEndpoint = credential.endpointOverride ?? provider.baseUrl

    // Fire-and-forget audit log — never blocks resolution
    void this.audit.log({
      eventType: 'credential_accessed',
      userId,
      agentId,
      pluginId: plugin.id,
      providerId: provider.id,
      metadata: { model, modelResolutionLevel, credentialId: credential.id },
    })

    return {
      pluginEntrypoint: plugin.entrypoint,
      providerKey: provider.key,
      model,
      modelResolutionLevel,
      credentialId: credential.id,
      apiKey: decryptedApiKey,
      baseUrl: resolvedEndpoint,
      bindingConfig: binding.config,
    }
  }
}
