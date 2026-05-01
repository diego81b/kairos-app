import { Entity, PrimaryKey, Property, ManyToOne, Index, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { PluginType, PluginSource, PluginStatus } from '../../shared/types'
import { LlmProviderEntity } from './LlmProviderEntity'
import { UserEntity } from './UserEntity'

@Entity({ tableName: 'plugins' })
@Unique({ properties: ['name', 'version'] })
@Index({ properties: ['type'] })
@Index({ properties: ['status'] })
@Index({ properties: ['visibility'] })
export class PluginEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @Property({ length: 255 })
  name!: string

  @Property({ length: 50 })
  version!: string

  @Property({ length: 50 })
  type!: PluginType // 'provider' | 'agent' | 'tool'

  @Property({ length: 50 })
  source!: PluginSource // 'built_in' | 'local_package'

  @Property({ length: 50, default: 'private' })
  visibility: 'global' | 'private' = 'private' // 'global' = visible to all; 'private' = only creator

  // Nullable: only provider plugins are linked to a specific LLM provider
  @ManyToOne(() => LlmProviderEntity, { fieldName: 'provider_id', nullable: true, columnType: 'varchar(21)' })
  provider?: LlmProviderEntity

  // Entrypoint identifier used by PluginDiscoveryService to load the class
  @Property({ length: 500 })
  entrypoint!: string // e.g. 'built-in:AnthropicProviderPlugin' or 'local:@kairos/plugin-pm-custom'

  // Default model to use when binding has no model_name
  @Property({ length: 255, nullable: true })
  defaultModel?: string

  @Property({ columnType: 'jsonb', nullable: true })
  manifest?: Record<string, unknown> // full plugin manifest: capabilities, options schema, etc.

  @Property({ default: true })
  enabled: boolean = true

  @Property({ length: 50, default: 'active' })
  status: PluginStatus = 'active' // 'active' | 'deprecated' | 'beta' | 'invalid'

  @Property({ columnType: 'text', nullable: true })
  statusReason?: string // populated when status = 'invalid'

  @ManyToOne(() => UserEntity, { fieldName: 'created_by', nullable: true, columnType: 'varchar(21)' })
  createdBy?: UserEntity

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
