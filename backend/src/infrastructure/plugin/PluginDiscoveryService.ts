import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as path from 'path'
import type { PluginManifest } from '../../domain/plugin/IPlugin'
import { PluginRegistry } from './PluginRegistry'
import { LocalPackageSecurityPolicy } from './LocalPackageSecurityPolicy'

const REQUIRED_MANIFEST_FIELDS: Array<keyof PluginManifest> = [
  'name',
  'version',
  'type',
  'source',
  'entrypoint',
  'pluginApiVersion',
]

const SUPPORTED_PLUGIN_API_VERSION = '1'

/**
 * Discovers available plugins at application startup.
 *
 * Sources:
 *   1. Built-in: reads manifests directly from PluginRegistry instances.
 *   2. Local packages: scans the directory pointed to by PLUGIN_LOCAL_PATH env var.
 *      Each sub-directory must contain a `kairos-plugin.json` manifest file.
 *      No code is executed during discovery — only the JSON manifest is read.
 *
 * Security:
 *   - Local package path is resolved to an absolute path and validated against
 *     the configured whitelist root to prevent path traversal.
 *   - Remote plugin loading is not supported.
 */
@Injectable()
export class PluginDiscoveryService {
  private readonly logger = new Logger(PluginDiscoveryService.name)

  constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly config: ConfigService,
    private readonly securityPolicy: LocalPackageSecurityPolicy,
  ) {}

  /**
   * Discover all plugins from all sources.
   * Returns manifests that pass validation; invalid manifests are logged and skipped.
   */
  discover(): DiscoveryResult {
    const builtIn = this._discoverBuiltIn()
    const local = this._discoverLocal()
    return { builtIn, local }
  }

  // ── Built-in ──────────────────────────────────────────────────────────────

  private _discoverBuiltIn(): ValidatedManifest[] {
    const results: ValidatedManifest[] = []
    for (const plugin of this.pluginRegistry.listProviderPlugins()) {
      const validation = this._validate(plugin.manifest, 'built_in')
      results.push({ manifest: plugin.manifest, valid: validation.valid, errors: validation.errors })
      if (!validation.valid) {
        this.logger.warn(
          `Built-in plugin "${plugin.manifest.name}" has invalid manifest: ${validation.errors.join(', ')}`,
        )
      }
    }
    return results
  }

  // ── Local packages ────────────────────────────────────────────────────────

  private _discoverLocal(): ValidatedManifest[] {
    const localPath = this.config.get<string>('plugins.localPath')
    if (!localPath) return []

    const resolvedRoot = path.resolve(localPath)
    if (!fs.existsSync(resolvedRoot)) {
      this.logger.warn(`PLUGIN_LOCAL_PATH "${resolvedRoot}" does not exist — skipping local discovery`)
      return []
    }

    const stat = fs.statSync(resolvedRoot)
    if (!stat.isDirectory()) {
      this.logger.warn(`PLUGIN_LOCAL_PATH "${resolvedRoot}" is not a directory — skipping local discovery`)
      return []
    }

    const results: ValidatedManifest[] = []
    let entries: string[]
    try {
      entries = fs.readdirSync(resolvedRoot)
    } catch (err) {
      this.logger.error(`Cannot read PLUGIN_LOCAL_PATH "${resolvedRoot}": ${(err as Error).message}`)
      return []
    }

    for (const entry of entries) {
      const entryPath = path.join(resolvedRoot, entry)

      // Guard against path traversal: resolved path must start with root
      const resolved = path.resolve(entryPath)
      if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
        this.logger.warn(`Skipping suspicious path "${resolved}"`)
        continue
      }

      if (!fs.statSync(resolved).isDirectory()) continue

      const manifestPath = path.join(resolved, 'kairos-plugin.json')
      if (!fs.existsSync(manifestPath)) {
        this.logger.debug(`No kairos-plugin.json in "${resolved}" — skipping`)
        continue
      }

      let raw: unknown
      try {
        const content = fs.readFileSync(manifestPath, 'utf-8')
        raw = JSON.parse(content)
      } catch (err) {
        this.logger.warn(`Cannot parse kairos-plugin.json in "${resolved}": ${(err as Error).message}`)
        results.push({ manifest: null, valid: false, errors: ['Invalid JSON in kairos-plugin.json'], packageDir: resolved })
        continue
      }

      const manifest = raw as PluginManifest
      const validation = this._validate(manifest, 'local_package')
      // Security policy check (naming convention, checksum, source field)
      const security = this.securityPolicy.check(manifest, resolved, resolvedRoot)
      if (!security.allowed) {
        this.logger.warn(`Security policy rejected local plugin at "${resolved}": ${security.reason}`)
        results.push({ manifest, valid: false, errors: [security.reason ?? 'security policy violation'], packageDir: resolved })
        continue
      }

      results.push({ manifest, valid: validation.valid, errors: validation.errors, packageDir: resolved })
      if (!validation.valid) {
        this.logger.warn(`Local plugin at "${resolved}" has invalid manifest: ${validation.errors.join(', ')}`)
      }
    }

    return results
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private _validate(
    manifest: PluginManifest | null,
    expectedSource: 'built_in' | 'local_package',
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    if (!manifest) {
      return { valid: false, errors: ['manifest is null'] }
    }

    for (const field of REQUIRED_MANIFEST_FIELDS) {
      if (!manifest[field]) errors.push(`missing required field: ${field}`)
    }

    if (manifest.source && manifest.source !== expectedSource) {
      errors.push(`source mismatch: manifest says "${manifest.source}" but expected "${expectedSource}"`)
    }

    if (manifest.pluginApiVersion && manifest.pluginApiVersion !== SUPPORTED_PLUGIN_API_VERSION) {
      errors.push(`unsupported pluginApiVersion "${manifest.pluginApiVersion}" (supported: "${SUPPORTED_PLUGIN_API_VERSION}")`)
    }

    const validTypes = ['provider', 'agent', 'tool']
    if (manifest.type && !validTypes.includes(manifest.type)) {
      errors.push(`invalid type "${manifest.type}" (must be one of: ${validTypes.join(', ')})`)
    }

    // Local packages must use 'local:<package-name>' entrypoint format
    if (expectedSource === 'local_package' && manifest.entrypoint && !manifest.entrypoint.startsWith('local:')) {
      errors.push(`local plugin entrypoint must start with "local:" (got "${manifest.entrypoint}")`)
    }

    return { valid: errors.length === 0, errors }
  }
}

// ── Result types ─────────────────────────────────────────────────────────────

export interface ValidatedManifest {
  manifest: PluginManifest | null
  valid: boolean
  errors: string[]
  /** Only present for local package plugins */
  packageDir?: string
}

export interface DiscoveryResult {
  builtIn: ValidatedManifest[]
  local: ValidatedManifest[]
}
