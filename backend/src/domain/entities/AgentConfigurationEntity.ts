import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { AgentType, LLMProvider } from '../../shared/types'

@Entity({ tableName: 'agent_configurations' })
export class AgentConfigurationEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @Unique()
  @Property({ length: 50 })
  agentType!: AgentType

  @Property({ length: 50, default: 'anthropic' })
  provider: LLMProvider = 'anthropic'

  @Property({ length: 255, default: 'claude-sonnet-4-6' })
  model: string = 'claude-sonnet-4-6'

  @Property({ columnType: 'decimal(3,2)', default: 0.7 })
  temperature: number = 0.7

  @Property({ default: 4096 })
  maxTokens: number = 4096

  @Property({ columnType: 'decimal(10,4)', nullable: true })
  costLimit?: number

  @Property({ default: true })
  enabled: boolean = true

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
