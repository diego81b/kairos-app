import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { AgentType } from '../../shared/types'
import { UserEntity } from './UserEntity'

@Entity({ tableName: 'agents' })
@Index({ properties: ['agentType'] })
@Index({ properties: ['isActive'] })
@Index({ properties: ['visibility'] })
@Index({ properties: ['createdBy'] })
export class AgentEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @Property({ length: 255 })
  name!: string

  @Property({ length: 50 })
  agentType!: AgentType

  @Property({ columnType: 'text', nullable: true })
  description?: string


  @Property({ columnType: 'text', nullable: true })
  systemPrompt?: string

  @Property({ columnType: 'text', nullable: true })
  output_format?: string

  @Property({ columnType: 'text', nullable: true })
  output_example?: string

  @Property({ columnType: 'text', nullable: true })
  after_output?: string

  @Property({ length: 50, default: 'global' })
  visibility: 'global' | 'private' = 'global' // 'global' = visible to all; 'private' = user-created

  @ManyToOne(() => UserEntity, { fieldName: 'created_by', nullable: true, columnType: 'varchar(21)' })
  createdBy?: UserEntity // null = built-in; set = user-created private agent

  @Property({ default: true })
  isActive: boolean = true

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()
}
