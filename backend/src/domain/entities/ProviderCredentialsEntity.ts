import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { LLMProvider } from '../../shared/types'

@Entity({ tableName: 'provider_credentials' })
export class ProviderCredentialsEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @Unique()
  @Property({ length: 50 })
  provider!: LLMProvider

  @Property({ columnType: 'text' })
  apiKey!: string // stored encrypted

  @Property({ length: 2000, nullable: true })
  endpoint?: string

  @Property({ columnType: 'jsonb', nullable: true })
  extra?: Record<string, unknown>

  @Property({ default: true })
  isActive: boolean = true

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
