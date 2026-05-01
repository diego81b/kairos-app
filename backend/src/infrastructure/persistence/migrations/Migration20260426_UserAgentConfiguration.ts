import { Migration } from '@mikro-orm/migrations'

export class Migration20260426_UserAgentConfiguration extends Migration {
  async up(): Promise<void> {
    // ── agents: add visibility, created_by, system_prompt ──────────────────────
    this.addSql(`ALTER TABLE "agents" ADD COLUMN "visibility" varchar(50) NOT NULL DEFAULT 'global';`)
    this.addSql(`ALTER TABLE "agents" ADD COLUMN "created_by" varchar(21) NULL;`)
    this.addSql(`
      ALTER TABLE "agents"
        ADD CONSTRAINT "agents_created_by_fkey"
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
    `)
    this.addSql(`CREATE INDEX "agents_visibility_idx" ON "agents" ("visibility");`)
    this.addSql(`CREATE INDEX "agents_created_by_idx" ON "agents" ("created_by");`)

    // ── plugins: add visibility ────────────────────────────────────────────────
    this.addSql(`ALTER TABLE "plugins" ADD COLUMN "visibility" varchar(50) NOT NULL DEFAULT 'private';`)
    this.addSql(`CREATE INDEX "plugins_visibility_idx" ON "plugins" ("visibility");`)

    // ── user_agent_configurations ──────────────────────────────────────────────
    this.addSql(`
      CREATE TABLE "user_agent_configurations" (
        "id" varchar(21) NOT NULL,
        "user_id" varchar(21) NOT NULL,
        "agent_id" varchar(21) NOT NULL,
        "chosen_provider_id" varchar(21) NOT NULL,
        "chosen_model" varchar(255) NULL,
        "temperature_override" decimal(3,2) NULL,
        "max_tokens_override" integer NULL,
        "config" jsonb NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "user_agent_configurations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "user_agent_configurations_user_agent_unique" UNIQUE ("user_id", "agent_id"),
        CONSTRAINT "user_agent_configurations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "user_agent_configurations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "user_agent_configurations_chosen_provider_id_fkey" FOREIGN KEY ("chosen_provider_id") REFERENCES "llm_providers"("id") ON DELETE RESTRICT
      );
    `)
    this.addSql(`CREATE INDEX "user_agent_configurations_user_id_idx" ON "user_agent_configurations" ("user_id");`)
    this.addSql(`CREATE INDEX "user_agent_configurations_agent_id_idx" ON "user_agent_configurations" ("agent_id");`)
    this.addSql(`CREATE INDEX "user_agent_configurations_chosen_provider_id_idx" ON "user_agent_configurations" ("chosen_provider_id");`)
  }

  async down(): Promise<void> {
    // ── drop user_agent_configurations ──────────────────────────────────────────
    this.addSql(`DROP TABLE IF EXISTS "user_agent_configurations";`)

    // ── plugins: drop visibility ──────────────────────────────────────────────────
    this.addSql(`ALTER TABLE "plugins" DROP COLUMN "visibility";`)

    // ── agents: drop new columns ────────────────────────────────────────────────
    this.addSql(`ALTER TABLE "agents" DROP COLUMN IF EXISTS "created_by";`)
    this.addSql(`ALTER TABLE "agents" DROP COLUMN IF EXISTS "visibility";`)
  }
}
