import { Migration } from '@mikro-orm/migrations'

export class Migration20260426_PluginSystem extends Migration {
  async up(): Promise<void> {
    // ── llm_providers ────────────────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE "llm_providers" (
        "id" varchar(21) NOT NULL,
        "key" varchar(100) NOT NULL,
        "display_name" varchar(255) NOT NULL,
        "base_url" varchar(2000) NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "llm_providers_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "llm_providers_key_unique" UNIQUE ("key")
      );
    `)
    this.addSql(`CREATE INDEX "llm_providers_enabled_idx" ON "llm_providers" ("enabled");`)

    // ── llm_provider_credentials ─────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE "llm_provider_credentials" (
        "id" varchar(21) NOT NULL,
        "provider_id" varchar(21) NOT NULL,
        "user_id" varchar(21) NOT NULL,
        "api_key" text NOT NULL,
        "endpoint_override" varchar(2000) NULL,
        "extra" jsonb NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "llm_provider_credentials_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "llm_provider_credentials_provider_user_unique" UNIQUE ("provider_id", "user_id"),
        CONSTRAINT "llm_provider_credentials_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "llm_providers"("id") ON DELETE CASCADE,
        CONSTRAINT "llm_provider_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `)
    this.addSql(`CREATE INDEX "llm_provider_credentials_user_id_idx" ON "llm_provider_credentials" ("user_id");`)
    this.addSql(`CREATE INDEX "llm_provider_credentials_provider_id_idx" ON "llm_provider_credentials" ("provider_id");`)

    // ── plugins ───────────────────────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE "plugins" (
        "id" varchar(21) NOT NULL,
        "name" varchar(255) NOT NULL,
        "version" varchar(50) NOT NULL,
        "type" varchar(50) NOT NULL,
        "source" varchar(50) NOT NULL,
        "provider_id" varchar(21) NULL,
        "entrypoint" varchar(500) NOT NULL,
        "default_model" varchar(255) NULL,
        "manifest" jsonb NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "status_reason" text NULL,
        "created_by" varchar(21) NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "plugins_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "plugins_name_version_unique" UNIQUE ("name", "version"),
        CONSTRAINT "plugins_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "llm_providers"("id") ON DELETE SET NULL,
        CONSTRAINT "plugins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `)
    this.addSql(`CREATE INDEX "plugins_type_idx" ON "plugins" ("type");`)
    this.addSql(`CREATE INDEX "plugins_status_idx" ON "plugins" ("status");`)
    this.addSql(`CREATE INDEX "plugins_enabled_idx" ON "plugins" ("enabled");`)

    // ── agent_plugin_bindings ─────────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE "agent_plugin_bindings" (
        "id" varchar(21) NOT NULL,
        "agent_id" varchar(21) NOT NULL,
        "plugin_id" varchar(21) NOT NULL,
        "model_name" varchar(255) NULL,
        "priority" integer NOT NULL DEFAULT 100,
        "enabled" boolean NOT NULL DEFAULT true,
        "config" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "agent_plugin_bindings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "agent_plugin_bindings_agent_plugin_unique" UNIQUE ("agent_id", "plugin_id"),
        CONSTRAINT "agent_plugin_bindings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "agent_plugin_bindings_plugin_id_fkey" FOREIGN KEY ("plugin_id") REFERENCES "plugins"("id") ON DELETE CASCADE
      );
    `)
    this.addSql(`CREATE INDEX "agent_plugin_bindings_agent_id_idx" ON "agent_plugin_bindings" ("agent_id");`)

    // ── cost_logs: add plugin audit columns ───────────────────────────────────
    this.addSql(`ALTER TABLE "cost_logs" ADD COLUMN "plugin_id" varchar(21) NULL;`)
    this.addSql(`ALTER TABLE "cost_logs" ADD COLUMN "resolved_model" varchar(255) NULL;`)
    this.addSql(`ALTER TABLE "cost_logs" ADD COLUMN "model_resolution_level" varchar(50) NULL;`)
    this.addSql(`
      ALTER TABLE "cost_logs"
        ADD CONSTRAINT "cost_logs_plugin_id_fkey"
        FOREIGN KEY ("plugin_id") REFERENCES "plugins"("id") ON DELETE SET NULL;
    `)
    this.addSql(`CREATE INDEX "cost_logs_plugin_id_idx" ON "cost_logs" ("plugin_id");`)
  }

  async down(): Promise<void> {
    // Revert cost_logs additions first (no dependent tables)
    this.addSql(`DROP INDEX IF EXISTS "cost_logs_plugin_id_idx";`)
    this.addSql(`ALTER TABLE "cost_logs" DROP CONSTRAINT IF EXISTS "cost_logs_plugin_id_fkey";`)
    this.addSql(`ALTER TABLE "cost_logs" DROP COLUMN IF EXISTS "model_resolution_level";`)
    this.addSql(`ALTER TABLE "cost_logs" DROP COLUMN IF EXISTS "resolved_model";`)
    this.addSql(`ALTER TABLE "cost_logs" DROP COLUMN IF EXISTS "plugin_id";`)

    // Drop in reverse FK dependency order
    this.addSql(`DROP TABLE IF EXISTS "agent_plugin_bindings" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "plugins" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "llm_provider_credentials" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "llm_providers" CASCADE;`)
  }
}
