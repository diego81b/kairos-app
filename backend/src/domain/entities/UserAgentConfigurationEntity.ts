import { Entity, PrimaryKey, Property, ManyToOne, Index, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import { UserEntity } from './UserEntity'
import { AgentEntity } from './AgentEntity'
import { LlmProviderEntity } from './LlmProviderEntity'

/**
 * UserAgentConfigurationEntity
 *
 * Represents a user's configuration for a specific agent.
 * Each user can configure each agent once, choosing a provider and optionally overriding the model.
 *
 * - One configuration per (user_id, agent_id) pair
 * - Configuration encapsulates: chosen provider, chosen model override, temperature override, etc.
 * - User must have credentials for the chosen provider before executing the agent
 */
@Entity({ tableName: 'user_agent_configurations' })
@Unique({ properties: ['user', 'agent'] })
@Index({ properties: ['user'] })
@Index({ properties: ['agent'] })
@Index({ properties: ['chosenProvider'] })
export class UserAgentConfigurationEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @ManyToOne(() => UserEntity, { fieldName: 'user_id', columnType: 'varchar(21)' })
  user!: UserEntity

  @ManyToOne(() => AgentEntity, { fieldName: 'agent_id', columnType: 'varchar(21)' })
  agent!: AgentEntity

  @ManyToOne(() => LlmProviderEntity, { fieldName: 'chosen_provider_id', columnType: 'varchar(21)' })
  chosenProvider!: LlmProviderEntity

  @Property({ length: 255, nullable: true })
  chosenModel?: string // optional override of provider's default model

  @Property({ columnType: 'decimal(3,2)', nullable: true })
  temperatureOverride?: number // optional override, typically 0-2

  @Property({ nullable: true })
  maxTokensOverride?: number // optional override for context length

  @Property({ columnType: 'jsonb', nullable: true })
  config?: Record<string, unknown> // reserved for future per-binding runtime config

  @Property({ default: true })
  enabled: boolean = true

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
