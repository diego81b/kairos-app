import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'

@Entity({ tableName: 'llm_providers' })
export class LlmProviderEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @Unique()
  @Property({ length: 100 })
  key!: string // e.g. 'anthropic', 'openai', 'openrouter', 'ollama', 'custom-xyz'

  @Property({ length: 255 })
  displayName!: string

  @Property({ length: 2000, nullable: true })
  baseUrl?: string

  @Property({ default: true })
  enabled: boolean = true

  @Property({ columnType: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> // default model, supported params, etc.

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
