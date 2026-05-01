import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@mikro-orm/nestjs'
import type { EntityRepository } from '@mikro-orm/core'
import { PluginDiscoveryService } from './PluginDiscoveryService'
import type { ValidatedManifest } from './PluginDiscoveryService'
import type { PluginManifest } from '../../domain/plugin/IPlugin'
import { PluginEntity } from '../../domain/entities/PluginEntity'
import { LlmProviderEntity } from '../../domain/entities/LlmProviderEntity'
import type { PluginStatus } from '../../shared/types'

export interface SyncStats {
  inserted: number
  updated: number
  markedInvalid: number
  skipped: number
}

/**
 * Syncs discovered plugin manifests into the `plugins` DB table at boot.
 *
 * Strategy per (name, version) pair:
 *   - Not found → INSERT
 *   - Found, valid manifest → UPDATE metadata fields (entrypoint, manifest, defaultModel,
 *     status=active). Never demotes a manually-set status='deprecated'.
 *   - Found, invalid manifest → UPDATE status='invalid', statusReason
 *   - source='built_in' rows are never deleted automatically; manual DB ops are required.
 */
@Injectable()
export class PluginDbSyncService implements OnModuleInit {
  private readonly logger = new Logger(PluginDbSyncService.name)

  constructor(
    @InjectRepository(PluginEntity) private readonly pluginRepo: EntityRepository<PluginEntity>,
    @InjectRepository(LlmProviderEntity) private readonly providerRepo: EntityRepository<LlmProviderEntity>,
    private readonly discovery: PluginDiscoveryService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sync()
  }

  async sync(): Promise<SyncStats> {
    const stats: SyncStats = { inserted: 0, updated: 0, markedInvalid: 0, skipped: 0 }
    const { builtIn, local } = this.discovery.discover()

    const allDiscovered = [...builtIn, ...local]
    this.logger.log(
      `Plugin discovery: ${builtIn.length} built-in, ${local.length} local → processing ${allDiscovered.length} manifest(s)`,
    )

    // Fork a child EM to keep sync isolated
    const fork = this.pluginRepo.getEntityManager().fork()

    for (const discovered of allDiscovered) {
      await this._syncOne(fork, discovered, stats)
    }

    try {
      await fork.flush()
    } catch (err) {
      this.logger.error(`Plugin DB sync flush failed: ${(err as Error).message}`, (err as Error).stack)
    }

    this.logger.log(
      `Plugin sync complete — inserted=${stats.inserted} updated=${stats.updated} invalid=${stats.markedInvalid} skipped=${stats.skipped}`,
    )
    return stats
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _syncOne(
    em: any,
    discovered: ValidatedManifest,
    stats: SyncStats,
  ): Promise<void> {
    const { manifest, valid, errors } = discovered

    // If manifest couldn't even be parsed (null), log and skip
    if (!manifest) {
      this.logger.warn(`Skipping unparseable manifest in "${discovered.packageDir ?? 'unknown'}"`)
      stats.skipped++
      return
    }

    let entity: PluginEntity | null = await em.findOne(PluginEntity, { name: manifest.name, version: manifest.version })

    if (!valid) {
      if (entity) {
        // Mark existing record as invalid
        entity.status = 'invalid'
        entity.statusReason = errors.join('; ')
        stats.markedInvalid++
      } else {
        // No point inserting an invalid record; just log
        this.logger.warn(
          `Skipping invalid plugin "${manifest.name}@${manifest.version}": ${errors.join(', ')}`,
        )
        stats.skipped++
      }
      return
    }

    // Resolve provider entity for provider-type plugins
    let providerEntity: LlmProviderEntity | null = null
    if (manifest.type === 'provider' && manifest.providerKey) {
      providerEntity = await em.findOne(LlmProviderEntity, { key: manifest.providerKey })
      if (!providerEntity) {
        this.logger.warn(
          `Plugin "${manifest.name}": providerKey "${manifest.providerKey}" not found in DB — will be linked later`,
        )
      }
    }

    const manifestJson = this._serializeManifest(manifest)

    if (!entity) {
      entity = new PluginEntity()
      entity.name = manifest.name
      entity.version = manifest.version
      entity.type = manifest.type as PluginEntity['type']
      entity.source = manifest.source as PluginEntity['source']
      if (providerEntity) entity.provider = providerEntity
      entity.entrypoint = manifest.entrypoint
      entity.defaultModel = manifest.defaultModel
      entity.manifest = manifestJson
      entity.enabled = true
      entity.status = 'active' as PluginStatus
      em.persist(entity)
      stats.inserted++
    } else {
      // Update only technical metadata — do not overwrite user-set fields like `enabled`
      entity.entrypoint = manifest.entrypoint
      entity.defaultModel = manifest.defaultModel
      entity.manifest = manifestJson
      if (providerEntity) entity.provider = providerEntity

      // Restore active status only if it was previously set to invalid
      // (do not override 'deprecated' which is a manual decision)
      if (entity.status === 'invalid') {
        entity.status = 'active'
        entity.statusReason = undefined
      }
      stats.updated++
    }
  }

  private _serializeManifest(manifest: PluginManifest): Record<string, unknown> {
    return {
      name: manifest.name,
      version: manifest.version,
      type: manifest.type,
      source: manifest.source,
      entrypoint: manifest.entrypoint,
      providerKey: manifest.providerKey,
      defaultModel: manifest.defaultModel,
      capabilities: manifest.capabilities,
      pluginApiVersion: manifest.pluginApiVersion,
    }
  }
}
