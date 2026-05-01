import { Injectable, Logger } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { PluginManifest } from '../../domain/plugin/IPlugin'

export interface SecurityCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * Enforces the local package security policy before a manifest is trusted.
 *
 * Policy rules (all must pass):
 *  1. Package directory must be inside PLUGIN_LOCAL_PATH (no path traversal).
 *  2. Package name must match the `kairos-plugin-*` naming convention
 *     OR appear in an explicit allowlist (PLUGIN_ALLOWLIST env, comma-separated).
 *  3. If a `.checksum` file exists alongside `kairos-plugin.json`, its SHA-256
 *     hash must match the manifest content — detects tampering.
 *  4. The manifest `source` field must be `'local_package'` (built-in source
 *     in a local directory is suspicious).
 */
@Injectable()
export class LocalPackageSecurityPolicy {
  private readonly logger = new Logger(LocalPackageSecurityPolicy.name)

  /** Packages explicitly allowed regardless of naming convention */
  private readonly allowlist: Set<string>

  constructor() {
    const raw = process.env.PLUGIN_ALLOWLIST ?? ''
    this.allowlist = new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }

  /**
   * Validates a discovered local manifest against the security policy.
   *
   * @param manifest    Parsed manifest object.
   * @param packageDir  Absolute path to the package directory.
   * @param localRoot   Absolute path to PLUGIN_LOCAL_PATH root.
   */
  check(manifest: PluginManifest, packageDir: string, localRoot: string): SecurityCheckResult {
    // Rule 1: path containment
    const resolvedDir = path.resolve(packageDir)
    const resolvedRoot = path.resolve(localRoot)
    if (!resolvedDir.startsWith(resolvedRoot + path.sep) && resolvedDir !== resolvedRoot) {
      return { allowed: false, reason: `Path traversal detected: "${resolvedDir}" is outside "${resolvedRoot}"` }
    }

    // Rule 2: naming convention OR allowlist
    const isConventionName = /^kairos-plugin-/.test(manifest.name)
    const isAllowlisted = this.allowlist.has(manifest.name)
    if (!isConventionName && !isAllowlisted) {
      return {
        allowed: false,
        reason: `Plugin name "${manifest.name}" does not match "kairos-plugin-*" convention and is not in PLUGIN_ALLOWLIST`,
      }
    }

    // Rule 3: optional checksum verification
    const checksumFile = path.join(resolvedDir, '.checksum')
    if (fs.existsSync(checksumFile)) {
      const manifestFile = path.join(resolvedDir, 'kairos-plugin.json')
      const checksumResult = this._verifyChecksum(manifestFile, checksumFile)
      if (!checksumResult.allowed) return checksumResult
    }

    // Rule 4: source must be 'local_package'
    if (manifest.source !== 'local_package') {
      return {
        allowed: false,
        reason: `Local manifest declares source="${manifest.source}" — expected "local_package"`,
      }
    }

    return { allowed: true }
  }

  private _verifyChecksum(manifestFile: string, checksumFile: string): SecurityCheckResult {
    try {
      const content = fs.readFileSync(manifestFile)
      const expected = fs.readFileSync(checksumFile, 'utf-8').trim().toLowerCase()
      const actual = crypto.createHash('sha256').update(content).digest('hex')
      if (actual !== expected) {
        return {
          allowed: false,
          reason: `Checksum mismatch for "${manifestFile}": expected ${expected}, got ${actual}`,
        }
      }
      return { allowed: true }
    } catch (err) {
      return {
        allowed: false,
        reason: `Cannot verify checksum for "${manifestFile}": ${(err as Error).message}`,
      }
    }
  }
}
