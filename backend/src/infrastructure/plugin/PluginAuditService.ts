import { Injectable, Logger } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/postgresql'
import { PluginAuditLogEntity, type AuditEventType } from '../../domain/entities/PluginAuditLogEntity'

export interface AuditEventPayload {
  eventType: AuditEventType
  userId?: string
  agentId?: string
  pluginId?: string
  providerId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

/**
 * Writes append-only audit entries for every sensitive plugin / credential operation.
 *
 * The service never throws: errors are caught and logged so that a failed
 * audit write never blocks the primary operation.
 */
@Injectable()
export class PluginAuditService {
  private readonly logger = new Logger(PluginAuditService.name)

  constructor(private readonly em: EntityManager) {}

  async log(payload: AuditEventPayload): Promise<void> {
    try {
      // Fork to keep audit writes isolated from the caller's Unit of Work
      const fork = this.em.fork()
      const entry = new PluginAuditLogEntity()
      entry.eventType = payload.eventType
      entry.userId = payload.userId
      entry.agentId = payload.agentId
      entry.pluginId = payload.pluginId
      entry.providerId = payload.providerId
      entry.metadata = payload.metadata
      entry.ipAddress = payload.ipAddress
      fork.persist(entry)
      await fork.flush()
    } catch (err) {
      // Non-blocking: log the failure but do not propagate
      this.logger.error(
        `Audit write failed [event=${payload.eventType}]: ${(err as Error).message}`,
        (err as Error).stack,
      )
    }
  }
}
