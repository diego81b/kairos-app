import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@mikro-orm/nestjs'
import type { EntityRepository } from '@mikro-orm/core'
import { AgentEntity } from '../../../domain/entities/AgentEntity'
import { UserAgentConfigurationEntity } from '../../../domain/entities/UserAgentConfigurationEntity'
import { LlmProviderEntity } from '../../../domain/entities/LlmProviderEntity'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { NotFoundException } from '../../../shared/errors'
import type { UpsertMyAgentConfigDto } from './my-agents.dto'
import type { CreateMyAgentDto } from './create-my-agent.dto'

@Injectable()
export class MyAgentsService {
  constructor(
    @InjectRepository(AgentEntity) private readonly agentRepo: EntityRepository<AgentEntity>,
    @InjectRepository(UserAgentConfigurationEntity) private readonly configRepo: EntityRepository<UserAgentConfigurationEntity>,
    @InjectRepository(LlmProviderEntity) private readonly providerRepo: EntityRepository<LlmProviderEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: EntityRepository<UserEntity>,
  ) {}

  /**
   * List all global active agents, each augmented with the user's configuration (if any).
   */
  async listAgentsForUser(userId: string) {
    const agents = await this.agentRepo.findAll({
      where: { visibility: 'global', isActive: true },
      orderBy: { agentType: 'ASC' },
    })

    const configs = await this.configRepo.find(
      { user: { id: userId } },
      { populate: ['agent', 'chosenProvider'] },
    )

    const configByAgentId = new Map(configs.map(c => [c.agent.id, c]))

    return agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      agentType: agent.agentType,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      output_format: agent.output_format,
      output_example: agent.output_example,
      after_output: agent.after_output,
      isActive: agent.isActive,
      userConfig: configByAgentId.get(agent.id)
        ? this._serializeConfig(configByAgentId.get(agent.id)!)
        : null,
    }))
  }

  /**
   * Get the user's configuration for a specific agent.
   */
  async getAgentConfig(userId: string, agentId: string) {
    const agent = await this.agentRepo.findOne({ id: agentId, visibility: 'global', isActive: true })
    if (!agent) throw new NotFoundException('Agent', agentId)

    const config = await this.configRepo.findOne(
      { user: { id: userId }, agent: { id: agentId } },
      { populate: ['chosenProvider'] },
    )

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        agentType: agent.agentType,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
        output_format: agent.output_format,
        output_example: agent.output_example,
        after_output: agent.after_output,
      },
      userConfig: config ? this._serializeConfig(config) : null,
    }
  }

  /**
   * Upsert the user's configuration for a specific agent.
   */
  async upsertAgentConfig(userId: string, agentId: string, dto: UpsertMyAgentConfigDto) {
    const em = this.agentRepo.getEntityManager()

    const agent = await this.agentRepo.findOne({ id: agentId, visibility: 'global', isActive: true })
    if (!agent) throw new NotFoundException('Agent', agentId)

    const provider = await this.providerRepo.findOne({ id: dto.chosenProviderId, enabled: true })
    if (!provider) throw new NotFoundException('LlmProvider', dto.chosenProviderId)

    let config = await this.configRepo.findOne({ user: { id: userId }, agent: { id: agentId } })

    if (!config) {
      const user = await this.userRepo.findOne({ id: userId })
      if (!user) throw new NotFoundException('User', userId)

      config = new UserAgentConfigurationEntity()
      config.user = user
      config.agent = agent
    }

    config.chosenProvider = provider
    if (dto.chosenModel !== undefined) config.chosenModel = dto.chosenModel
    if (dto.temperatureOverride !== undefined) config.temperatureOverride = dto.temperatureOverride
    if (dto.maxTokensOverride !== undefined) config.maxTokensOverride = dto.maxTokensOverride
    if (dto.config !== undefined) config.config = dto.config
    if (dto.enabled !== undefined) config.enabled = dto.enabled

    await em.persistAndFlush(config)

    return this._serializeConfig(config)
  }

  /**
   * Create a new private agent for the user (visible only to them).
   */
  async createMyAgent(userId: string, dto: CreateMyAgentDto) {
    const user = await this.userRepo.findOne({ id: userId })
    if (!user) throw new NotFoundException('User', userId)

    const agent = new AgentEntity()

    agent.name = dto.name
    agent.agentType = dto.agentType
    agent.description = dto.description
    agent.systemPrompt = dto.systemPrompt
    agent.output_format = dto.output_format
    agent.output_example = dto.output_example
    agent.after_output = dto.after_output
    agent.visibility = 'private'
    agent.createdBy = user
    agent.isActive = dto.isActive ?? true

    const em = this.agentRepo.getEntityManager()
    await em.persistAndFlush(agent)
    return {
      id: agent.id,
      name: agent.name,
      agentType: agent.agentType,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      output_format: agent.output_format,
      output_example: agent.output_example,
      after_output: agent.after_output,
      visibility: agent.visibility,
      isActive: agent.isActive,
      createdBy: user.id,
    }
  }

  /**
   * List all agents visible to the user: global active + their own private agents.
   */
  async listAllAgentsForUser(userId: string) {
    const [globalAgents, privateAgents] = await Promise.all([
      this.agentRepo.findAll({
        where: { visibility: 'global', isActive: true },
        orderBy: { agentType: 'ASC' },
      }),
      this.agentRepo.findAll({
        where: { visibility: 'private', createdBy: { id: userId }, isActive: true },
        orderBy: { agentType: 'ASC' },
      }),
    ])

    const configs = await this.configRepo.find(
      { user: { id: userId } },
      { populate: ['agent', 'chosenProvider'] },
    )

    const configByAgentId = new Map(configs.map(c => [c.agent.id, c]))

    const allAgents = [...globalAgents, ...privateAgents]

    return allAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      agentType: agent.agentType,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      output_format: agent.output_format,
      output_example: agent.output_example,
      after_output: agent.after_output,
      visibility: agent.visibility,
      isActive: agent.isActive,
      userConfig: configByAgentId.get(agent.id)
        ? this._serializeConfig(configByAgentId.get(agent.id)!)
        : null,
    }))
  }

  private _serializeConfig(config: UserAgentConfigurationEntity) {
    return {
      id: config.id,
      chosenProvider: {
        id: config.chosenProvider.id,
        key: config.chosenProvider.key,
        displayName: config.chosenProvider.displayName,
      },
      chosenModel: config.chosenModel ?? null,
      temperatureOverride: config.temperatureOverride ?? null,
      maxTokensOverride: config.maxTokensOverride ?? null,
      config: config.config ?? null,
      enabled: config.enabled,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  }
}
