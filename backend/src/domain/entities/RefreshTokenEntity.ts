import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core'
import { nanoid } from 'nanoid'
import { UserEntity } from './UserEntity'

@Entity({ tableName: 'refresh_tokens' })
@Index({ properties: ['user', 'expiresAt'] })
@Index({ properties: ['revokedAt'] })
export class RefreshTokenEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @ManyToOne(() => UserEntity, { fieldName: 'user_id', deleteRule: 'cascade', columnType: 'varchar(21)' })
  user!: UserEntity

  @Property({ unique: true, columnType: 'text' })
  token!: string

  @Property({ columnType: 'timestamp' })
  expiresAt!: Date

  @Property({ columnType: 'timestamp', nullable: true })
  revokedAt?: Date

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()
}
