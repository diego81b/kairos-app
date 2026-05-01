import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { AgentType, LLMProvider, ModelResolutionLevel } from '../../shared/types'
import { IssueEntity } from './IssueEntity'
import { PluginEntity } from './PluginEntity'

@Entity({ tableName: 'cost_logs' })
@Index({ properties: ['agent'] })
@Index({ properties: ['createdAt'] })
export class CostLogEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @ManyToOne(() => IssueEntity, { fieldName: 'issue_id', deleteRule: 'cascade', columnType: 'varchar(21)' })
  issue!: IssueEntity

  @Property({ length: 50 })
  agent!: AgentType

  @Property({ length: 50 })
  provider!: LLMProvider

  @Property({ length: 255 })
  model!: string

  // New: tracks which plugin produced this cost entry (nullable for legacy rows)
  @ManyToOne(() => PluginEntity, { fieldName: 'plugin_id', nullable: true, columnType: 'varchar(21)' })
  plugin?: PluginEntity

  // New: the model actually used after fallback resolution (null = legacy row)
  @Property({ length: 255, nullable: true })
  resolvedModel?: string

  // New: which level of the fallback chain provided the model
  @Property({ length: 50, nullable: true })
  modelResolutionLevel?: ModelResolutionLevel

  @Property({ default: 0 })
  inputTokens: number = 0

  @Property({ default: 0 })
  outputTokens: number = 0

  @Property({ columnType: 'decimal(10,6)', default: 0 })
  cost: number = 0

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()
}
