import { Entity, PrimaryKey, Property, ManyToOne, Index, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import { LlmProviderEntity } from './LlmProviderEntity'
import { UserEntity } from './UserEntity'

@Entity({ tableName: 'llm_provider_credentials' })
@Unique({ properties: ['provider', 'user'] })
@Index({ properties: ['user'] })
export class LlmProviderCredentialsEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @ManyToOne(() => LlmProviderEntity, { fieldName: 'provider_id', columnType: 'varchar(21)' })
  provider!: LlmProviderEntity

  @ManyToOne(() => UserEntity, { fieldName: 'user_id', columnType: 'varchar(21)' })
  user!: UserEntity

  @Property({ columnType: 'text' })
  apiKey!: string // stored encrypted

  @Property({ length: 2000, nullable: true })
  endpointOverride?: string // overrides provider base_url if set

  @Property({ columnType: 'jsonb', nullable: true })
  extra?: Record<string, unknown>

  @Property({ default: true })
  isActive: boolean = true

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
