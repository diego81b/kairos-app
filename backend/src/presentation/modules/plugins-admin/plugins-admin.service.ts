import { Injectable } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/postgresql'
import { wrap } from '@mikro-orm/core'
import { LlmProviderEntity } from '../../../domain/entities/LlmProviderEntity'
import { LlmProviderCredentialsEntity } from '../../../domain/entities/LlmProviderCredentialsEntity'
import { PluginEntity } from '../../../domain/entities/PluginEntity'
import { AgentPluginBindingEntity } from '../../../domain/entities/AgentPluginBindingEntity'
import { AgentEntity } from '../../../domain/entities/AgentEntity'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { PluginRegistry } from '../../../infrastructure/plugin/PluginRegistry'
import { PluginDbSyncService } from '../../../infrastructure/plugin/PluginDbSyncService'
import { PluginAuditService } from '../../../infrastructure/plugin/PluginAuditService'
import { encrypt, decrypt } from '../../../infrastructure/security/Encryption'
import { NotFoundException, ConflictException, DomainException } from '../../../shared/errors'
import type {
  CreateProviderDto,
  UpdateProviderDto,
  UpsertCredentialDto,
  CreateBindingDto,
  UpdateBindingDto,
} from './plugins-admin.dto'

@Injectable()
export class PluginsAdminService {
  constructor(
    private readonly em: EntityManager,
    private readonly pluginRegistry: PluginRegistry,
    private readonly pluginDbSync: PluginDbSyncService,
    private readonly audit: PluginAuditService,
  ) {}

  // ── Providers ─────────────────────────────────────────────────────────────

  async listProviders() {
    return this.em.findAll(LlmProviderEntity, { orderBy: { key: 'ASC' } })
  }

  async getProvider(id: string) {
    const provider = await this.em.findOne(LlmProviderEntity, { id })
    if (!provider) throw new NotFoundException('LlmProvider', id)
    return provider
  }

  async createProvider(dto: CreateProviderDto) {
    const existing = await this.em.findOne(LlmProviderEntity, { key: dto.key })
    if (existing) throw new ConflictException(`Provider with key "${dto.key}" already exists`)

    const provider = new LlmProviderEntity()
    provider.key = dto.key
    provider.displayName = dto.displayName
    if (dto.baseUrl !== undefined) provider.baseUrl = dto.baseUrl
    if (dto.metadata !== undefined) provider.metadata = dto.metadata
    provider.enabled = dto.enabled ?? true
    await this.em.persistAndFlush(provider)
    return provider
  }

  async updateProvider(id: string, dto: UpdateProviderDto) {
    const provider = await this.getProvider(id)
    wrap(provider).assign(dto)
    await this.em.flush()
    return provider
  }

  async deleteProvider(id: string) {
    const provider = await this.getProvider(id)
    await this.em.removeAndFlush(provider)
  }

  async testProviderConnection(id: string, userId: string) {
    const provider = await this.getProvider(id)
    const credential = await this.em.findOne(LlmProviderCredentialsEntity, {
      provider: id,
      user: userId,
      isActive: true,
    })
    if (!credential) {
      throw new NotFoundException(`No active credential for provider "${provider.key}" and current user`)
    }

    // Find the registry plugin for this provider
    const plugins = this.pluginRegistry.listProviderPlugins()
    const plugin = plugins.find((p) => p.manifest.providerKey === provider.key)
    if (!plugin) {
      throw new DomainException(`No built-in plugin registered for provider "${provider.key}"`)
    }

    const apiKey = decrypt(credential.apiKey)
    const baseUrl = credential.endpointOverride ?? provider.baseUrl
    const available = await plugin.isAvailable(apiKey, baseUrl ?? undefined)

    void this.audit.log({
      eventType: 'provider_test',
      userId,
      providerId: provider.id,
      metadata: { available, baseUrl },
    })

    return { available, providerKey: provider.key, baseUrl }
  }

  // ── Plugins ───────────────────────────────────────────────────────────────

  async listPlugins(type?: string) {
    const where = type ? { type: type as PluginEntity['type'] } : {}
    return this.em.find(PluginEntity, where, {
      populate: ['provider'],
      orderBy: { name: 'ASC' },
    })
  }

  async getPlugin(id: string) {
    const plugin = await this.em.findOne(PluginEntity, { id }, { populate: ['provider'] })
    if (!plugin) throw new NotFoundException('Plugin', id)
    return plugin
  }

  async triggerSync() {
    const stats = await this.pluginDbSync.sync()
    void this.audit.log({ eventType: 'plugin_sync', metadata: { stats } })
    return stats
  }

  // ── Agent Plugin Bindings ─────────────────────────────────────────────────

  async listBindings(agentId: string) {
    const agent = await this.em.findOne(AgentEntity, { id: agentId })
    if (!agent) throw new NotFoundException('Agent', agentId)
    return this.em.find(AgentPluginBindingEntity, { agent: agentId }, { populate: ['plugin', 'plugin.provider'] })
  }

  async createBinding(agentId: string, dto: CreateBindingDto) {
    const agent = await this.em.findOne(AgentEntity, { id: agentId })
    if (!agent) throw new NotFoundException('Agent', agentId)

    const plugin = await this.em.findOne(PluginEntity, { id: dto.pluginId })
    if (!plugin) throw new NotFoundException('Plugin', dto.pluginId)

    const existing = await this.em.findOne(AgentPluginBindingEntity, { agent: agentId, plugin: dto.pluginId })
    if (existing) throw new ConflictException(`Binding between agent "${agentId}" and plugin "${dto.pluginId}" already exists`)

    const binding = new AgentPluginBindingEntity()
    binding.agent = agent
    binding.plugin = plugin
    if (dto.modelName !== undefined) binding.modelName = dto.modelName
    binding.priority = dto.priority ?? 100
    binding.enabled = dto.enabled ?? true
    if (dto.config !== undefined) binding.config = dto.config
    await this.em.persistAndFlush(binding)
    void this.audit.log({
      eventType: 'binding_created',
      agentId,
      pluginId: plugin.id,
      metadata: { bindingId: binding.id, model: binding.modelName, priority: binding.priority },
    })
    return binding
  }

  async updateBinding(agentId: string, bindingId: string, dto: UpdateBindingDto) {
    const binding = await this.em.findOne(AgentPluginBindingEntity, { id: bindingId, agent: agentId })
    if (!binding) throw new NotFoundException('AgentPluginBinding', bindingId)
    wrap(binding).assign(dto)
    await this.em.flush()
    return binding
  }

  async deleteBinding(agentId: string, bindingId: string) {
    const binding = await this.em.findOne(AgentPluginBindingEntity, { id: bindingId, agent: agentId })
    if (!binding) throw new NotFoundException('AgentPluginBinding', bindingId)
    const pluginId = binding.plugin.id
    await this.em.removeAndFlush(binding)
    void this.audit.log({ eventType: 'binding_deleted', agentId, pluginId, metadata: { bindingId } })
  }

  // ── Provider Credentials (user-scoped) ───────────────────────────────────

  async listCredentials(userId: string) {
    const creds = await this.em.find(
      LlmProviderCredentialsEntity,
      { user: userId },
      { populate: ['provider'] },
    )
    // Never return raw apiKey — return masked version
    return creds.map((c) => ({
      id: c.id,
      providerId: c.provider.id,
      providerKey: c.provider.key,
      providerDisplayName: c.provider.displayName,
      endpointOverride: c.endpointOverride,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }))
  }

  async upsertCredential(userId: string, dto: UpsertCredentialDto) {
    const provider = await this.em.findOne(LlmProviderEntity, { id: dto.providerId })
    if (!provider) throw new NotFoundException('LlmProvider', dto.providerId)

    const user = await this.em.findOne(UserEntity, { id: userId })
    if (!user) throw new NotFoundException('User', userId)

    let credential = await this.em.findOne(LlmProviderCredentialsEntity, {
      provider: dto.providerId,
      user: userId,
    })

    const encryptedKey = encrypt(dto.apiKey)

    if (!credential) {
      credential = new LlmProviderCredentialsEntity()
      credential.provider = provider
      credential.user = user
      credential.apiKey = encryptedKey
      if (dto.endpointOverride !== undefined) credential.endpointOverride = dto.endpointOverride
      if (dto.extra !== undefined) credential.extra = dto.extra
      credential.isActive = dto.isActive ?? true
      this.em.persist(credential)
    } else {
      credential.apiKey = encryptedKey
      if (dto.endpointOverride !== undefined) credential.endpointOverride = dto.endpointOverride
      if (dto.extra !== undefined) credential.extra = dto.extra
      if (dto.isActive !== undefined) credential.isActive = dto.isActive
    }

    await this.em.flush()
    void this.audit.log({
      eventType: 'credential_upserted',
      userId,
      providerId: provider.id,
      metadata: { credentialId: credential.id },
    })
    return { id: credential.id, providerId: provider.id, providerKey: provider.key }
  }

  async deleteCredential(userId: string, credentialId: string) {
    const credential = await this.em.findOne(LlmProviderCredentialsEntity, {
      id: credentialId,
      user: userId,
    })
    if (!credential) throw new NotFoundException('LlmProviderCredential', credentialId)
    const providerId = credential.provider.id
    await this.em.removeAndFlush(credential)
    void this.audit.log({ eventType: 'credential_deleted', userId, providerId, metadata: { credentialId } })
  }

  // ── Dry-run resolution ────────────────────────────────────────────────────

  async dryRunResolve(agentId: string, userId: string) {
    const binding = await this.em.findOne(
      AgentPluginBindingEntity,
      { agent: agentId, enabled: true, plugin: { type: 'provider', enabled: true } },
      {
        populate: ['plugin', 'plugin.provider'] as const,
        orderBy: { priority: 'ASC' },
      },
    )
    if (!binding) throw new NotFoundException(`No active provider binding for agent "${agentId}"`)

    const plugin = binding.plugin
    const provider = plugin.provider
    if (!provider) throw new NotFoundException(`Plugin "${plugin.name}" has no linked provider`)

    let model: string | undefined
    let modelResolutionLevel: string
    if (binding.modelName) {
      model = binding.modelName
      modelResolutionLevel = 'binding'
    } else if (plugin.defaultModel) {
      model = plugin.defaultModel
      modelResolutionLevel = 'plugin_default'
    } else {
      model = provider.metadata?.defaultModel as string | undefined
      modelResolutionLevel = 'provider_default'
    }

    const hasCredential = !!(await this.em.findOne(LlmProviderCredentialsEntity, {
      provider: provider.id,
      user: userId,
      isActive: true,
    }))

    return {
      agentId,
      pluginName: plugin.name,
      pluginEntrypoint: plugin.entrypoint,
      providerKey: provider.key,
      providerDisplayName: provider.displayName,
      resolvedModel: model,
      modelResolutionLevel,
      bindingPriority: binding.priority,
      hasCredential,
    }
  }
}
