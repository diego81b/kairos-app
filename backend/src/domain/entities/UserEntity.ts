import { Entity, PrimaryKey, Property, OneToMany, Collection, Index, Opt } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import type { UserRole } from '../../shared/types'
import { IssueEntity } from './IssueEntity'

@Entity({ tableName: 'users' })
@Index({ properties: ['workspace'] })
export class UserEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string & Opt = nanoid()

  @Property({ unique: true, length: 255 })
  email!: string

  @Property({ length: 255 })
  password!: string

  @Property({ nullable: true, length: 255 })
  name?: string

  @Property({ length: 255, default: 'default' })
  workspace: string & Opt = 'default'

  @Property({ length: 20, default: 'USER' })
  role: UserRole & Opt = 'USER'

  @OneToMany(() => IssueEntity, (issue) => issue.createdBy, { eager: false })
  issues = new Collection<IssueEntity>(this)

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date & Opt = new Date()

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP', onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date()
}
