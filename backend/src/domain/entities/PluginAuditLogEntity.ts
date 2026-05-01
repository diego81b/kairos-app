import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core'
import { nanoid } from 'nanoid'

export type AuditEventType =
  | 'credential_accessed'
  | 'credential_upserted'
  | 'credential_deleted'
  | 'provider_test'
  | 'binding_created'
  | 'binding_deleted'
  | 'plugin_sync'

@Entity({ tableName: 'plugin_audit_log' })
@Index({ properties: ['userId'] })
@Index({ properties: ['eventType'] })
@Index({ properties: ['createdAt'] })
@Index({ properties: ['providerId'] })
export class PluginAuditLogEntity {
  @PrimaryKey({ columnType: 'varchar(21)' })
  id: string = nanoid()

  @Property({ length: 64 })
  eventType!: AuditEventType

  @Property({ length: 21, nullable: true })
  userId?: string

  @Property({ length: 21, nullable: true })
  agentId?: string

  @Property({ length: 21, nullable: true })
  pluginId?: string

  @Property({ length: 21, nullable: true })
  providerId?: string

  @Property({ columnType: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>

  /** IPv4 or IPv6 address of the caller, max 45 chars (IPv6 with brackets) */
  @Property({ length: 45, nullable: true })
  ipAddress?: string

  @Property({ columnType: 'timestamp', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date()
}
