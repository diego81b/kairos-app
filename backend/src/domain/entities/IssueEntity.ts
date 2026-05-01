import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, Index, Cascade } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { IssueSource, KanbanColumn, IssueStatus, EnabledAgents } from '../../shared/types'
import { DEFAULT_ENABLED_AGENTS } from '../../shared/types'
import { UserEntity } from './UserEntity'
import { AgentOutputEntity } from './AgentOutputEntity'
import { CostLogEntity } from './CostLogEntity'

@Entity({ tableName: 'issues' })
@Index({ properties: ['kanbanColumn'] })
@Index({ properties: ['source'] })
@Index({ properties: ['status'] })
@Index({ properties: ['createdAt'] })
export class IssueEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @ManyToOne(() => UserEntity, { fieldName: 'created_by', deleteRule: 'cascade', columnType: 'varchar(21)' })
  createdBy!: UserEntity

  @Property({ length: 255 })
  title!: string

  @Property({ columnType: 'text', nullable: true })
  description?: string

  @Property({ length: 50, default: 'manual' })
  source: IssueSource = 'manual'

  @Property({ length: 255, nullable: true })
  sourceId?: string

  @Property({ length: 2000, nullable: true })
  sourceUrl?: string

  @Property({ length: 2000, nullable: true })
  linkedPrMrUrl?: string

  @Property({ length: 50, default: 'backlog' })
  kanbanColumn: KanbanColumn = 'backlog'

  @Property({ length: 50, default: 'backlog' })
  status: IssueStatus = 'backlog'

  @Property({ columnType: 'jsonb', nullable: true })
  enabledAgents?: EnabledAgents = DEFAULT_ENABLED_AGENTS

  @OneToMany(() => AgentOutputEntity, (ao) => ao.issue, { cascade: [Cascade.REMOVE], eager: false })
  agentOutputs = new Collection<AgentOutputEntity>(this)

  @OneToMany(() => CostLogEntity, (cl) => cl.issue, { cascade: [Cascade.REMOVE], eager: false })
  costLogs = new Collection<CostLogEntity>(this)

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date = new Date()

  @Property({ columnType: 'timestamp', nullable: true })
  syncedAt?: Date
}
