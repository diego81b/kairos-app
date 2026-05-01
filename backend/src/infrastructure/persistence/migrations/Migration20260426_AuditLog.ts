import { Migration } from '@mikro-orm/migrations'

/**
 * PR6 — Audit log table for plugin / credential access events.
 *
 * Stores one row per meaningful event:
 *   - credential_accessed   — a decrypted API key was used in ProviderResolutionService
 *   - credential_upserted   — a user saved / replaced a credential
 *   - credential_deleted    — a user deleted a credential
 *   - provider_test         — test-connection endpoint called
 *   - binding_created       — a new agent-plugin binding was saved
 *   - binding_deleted       — a binding was removed
 *   - plugin_sync           — PluginDbSyncService.sync() was triggered manually
 *
 * The table is append-only; rows are never updated or deleted by the application.
 * Retention / archival is handled at the infrastructure (pg partitioning / cron) level.
 */
export class Migration20260426_AuditLog extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "plugin_audit_log" (
        "id"          varchar(21)   NOT NULL,
        "event_type"  varchar(64)   NOT NULL,
        "user_id"     varchar(21)   NULL,
        "agent_id"    varchar(21)   NULL,
        "plugin_id"   varchar(21)   NULL,
        "provider_id" varchar(21)   NULL,
        "metadata"    jsonb         NULL,
        "ip_address"  varchar(45)   NULL,
        "created_at"  timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "plugin_audit_log_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`CREATE INDEX "pal_user_id_idx"     ON "plugin_audit_log" ("user_id");`)
    this.addSql(`CREATE INDEX "pal_event_type_idx"  ON "plugin_audit_log" ("event_type");`)
    this.addSql(`CREATE INDEX "pal_created_at_idx"  ON "plugin_audit_log" ("created_at");`)
    this.addSql(`CREATE INDEX "pal_provider_id_idx" ON "plugin_audit_log" ("provider_id");`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "plugin_audit_log";`)
  }
}
