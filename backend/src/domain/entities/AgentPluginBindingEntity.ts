import { Entity, PrimaryKey, Property, ManyToOne, Index, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import { AgentEntity } from './AgentEntity'
import { PluginEntity } from './PluginEntity'

@Entity({ tableName: 'agent_plugin_bindings' })
@Unique({ properties: ['agent', 'plugin'] })
@Index({ properties: ['agent'] })
export class AgentPluginBindingEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @ManyToOne(() => AgentEntity, { fieldName: 'agent_id', columnType: 'varchar(21)' })
  agent!: AgentEntity

  @ManyToOne(() => PluginEntity, { fieldName: 'plugin_id', columnType: 'varchar(21)' })
  plugin!: PluginEntity

  // Level-1 model resolution: overrides plugin.defaultModel and provider.defaultModel
  @Property({ length: 255, nullable: true })
  modelName?: string

  // Lower number = higher priority when multiple provider plugins are bound to same agent
  @Property({ default: 100 })
  priority: number = 100

  @Property({ default: true })
  enabled: boolean = true

  // Per-binding config (e.g. temperature override, custom params)
  @Property({ columnType: 'jsonb', nullable: true })
  config?: Record<string, unknown>

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
