import { Entity, PrimaryKey, Property, ManyToOne, Index, Unique } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { AgentType, AgentOutputStatus } from '../../shared/types'
import { IssueEntity } from './IssueEntity'
import { UserEntity } from './UserEntity'

@Entity({ tableName: 'agent_outputs' })
@Unique({ properties: ['issue', 'agent', 'version'] })
@Index({ properties: ['agent'] })
@Index({ properties: ['status'] })
@Index({ properties: ['createdAt'] })
export class AgentOutputEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @ManyToOne(() => IssueEntity, { fieldName: 'issue_id', deleteRule: 'cascade', columnType: 'varchar(21)' })
  issue!: IssueEntity

  @Property({ length: 50 })
  agent!: AgentType

  @Property({ default: 1 })
  version: number = 1

  @Property({ length: 500, nullable: true })
  storageKey?: string

  @Property({ length: 50, default: 'minio' })
  storageProvider: string = 'minio'

  @Property({ length: 50, default: 'pending' })
  status: AgentOutputStatus = 'pending'

  @ManyToOne(() => UserEntity, { nullable: true, fieldName: 'approved_by', columnType: 'varchar(21)' })
  approvedBy?: UserEntity

  @Property({ columnType: 'timestamp', nullable: true })
  approvedAt?: Date

  @Property({ columnType: 'text', nullable: true })
  feedback?: string

  @Property({ default: false })
  syncedToSource: boolean = false

  @Property({ columnType: 'timestamp', nullable: true })
  syncedAt?: Date

  @Property({ nullable: true })
  inputTokens?: number

  @Property({ nullable: true })
  outputTokens?: number

  @Property({ columnType: 'decimal(10,6)', nullable: true })
  cost?: number

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()
}
