import { Migration } from '@mikro-orm/migrations'

export class Migration20260420_InitialSchema extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE "users" (
        "id" varchar(21) NOT NULL,
        "email" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "name" varchar(255) NULL,
        "workspace" varchar(255) NOT NULL DEFAULT 'default',
        "role" varchar(20) NOT NULL DEFAULT 'USER',
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_email_unique" UNIQUE ("email")
      );
    `)
    this.addSql(`CREATE INDEX "users_workspace_idx" ON "users" ("workspace");`)

    this.addSql(`
      CREATE TABLE "refresh_tokens" (
        "id" varchar(21) NOT NULL,
        "user_id" varchar(21) NOT NULL,
        "token" text NOT NULL,
        "expires_at" timestamp NOT NULL,
        "revoked_at" timestamp NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token"),
        CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `)
    this.addSql(`CREATE INDEX "refresh_tokens_user_id_expires_at_idx" ON "refresh_tokens" ("user_id", "expires_at");`)
    this.addSql(`CREATE INDEX "refresh_tokens_revoked_at_idx" ON "refresh_tokens" ("revoked_at");`)

    this.addSql(`
      CREATE TABLE "issues" (
        "id" varchar(21) NOT NULL,
        "created_by" varchar(21) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NULL,
        "source" varchar(50) NOT NULL DEFAULT 'manual',
        "source_id" varchar(255) NULL,
        "source_url" varchar(2000) NULL,
        "linked_pr_mr_url" varchar(2000) NULL,
        "kanban_column" varchar(50) NOT NULL DEFAULT 'backlog',
        "status" varchar(50) NOT NULL DEFAULT 'backlog',
        "enabled_agents" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "synced_at" timestamp NULL,
        CONSTRAINT "issues_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "issues_source_source_id_unique" UNIQUE ("source", "source_id"),
        CONSTRAINT "issues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `)
    this.addSql(`CREATE INDEX "issues_kanban_column_idx" ON "issues" ("kanban_column");`)
    this.addSql(`CREATE INDEX "issues_source_idx" ON "issues" ("source");`)
    this.addSql(`CREATE INDEX "issues_status_idx" ON "issues" ("status");`)
    this.addSql(`CREATE INDEX "issues_created_at_idx" ON "issues" ("created_at");`)

    this.addSql(`
      CREATE TABLE "agents" (
        "id" varchar(21) NOT NULL,
        "name" varchar(255) NOT NULL,
        "agent_type" varchar(50) NOT NULL,
        "description" text NULL,
        "system_prompt" text NULL,
        "output_format" text NULL,
        "output_example" text NULL,
        "after_output" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX "agents_agent_type_idx" ON "agents" ("agent_type");`)
    this.addSql(`CREATE INDEX "agents_is_active_idx" ON "agents" ("is_active");`)

    this.addSql(`
      CREATE TABLE "agent_outputs" (
        "id" varchar(21) NOT NULL,
        "issue_id" varchar(21) NOT NULL,
        "agent" varchar(50) NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "output_data" jsonb NULL,
        "output_markdown" text NULL,
        "status" varchar(50) NOT NULL DEFAULT 'pending',
        "approved_by" varchar(21) NULL,
        "approved_at" timestamp NULL,
        "feedback" text NULL,
        "synced_to_source" boolean NOT NULL DEFAULT false,
        "synced_at" timestamp NULL,
        "input_tokens" integer NULL,
        "output_tokens" integer NULL,
        "cost" decimal(10,6) NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "agent_outputs_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "agent_outputs_issue_agent_version_unique" UNIQUE ("issue_id", "agent", "version"),
        CONSTRAINT "agent_outputs_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE,
        CONSTRAINT "agent_outputs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `)
    this.addSql(`CREATE INDEX "agent_outputs_issue_id_idx" ON "agent_outputs" ("issue_id");`)
    this.addSql(`CREATE INDEX "agent_outputs_agent_idx" ON "agent_outputs" ("agent");`)
    this.addSql(`CREATE INDEX "agent_outputs_status_idx" ON "agent_outputs" ("status");`)
    this.addSql(`CREATE INDEX "agent_outputs_created_at_idx" ON "agent_outputs" ("created_at");`)

    this.addSql(`
      CREATE TABLE "agent_configurations" (
        "id" varchar(21) NOT NULL,
        "agent_type" varchar(50) NOT NULL,
        "provider" varchar(50) NOT NULL DEFAULT 'anthropic',
        "model" varchar(255) NOT NULL DEFAULT 'claude-sonnet-4-6',
        "temperature" decimal(3,2) NOT NULL DEFAULT 0.7,
        "max_tokens" integer NOT NULL DEFAULT 4096,
        "cost_limit" decimal(10,4) NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "agent_configurations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "agent_configurations_agent_type_unique" UNIQUE ("agent_type")
      );
    `)

    this.addSql(`
      CREATE TABLE "provider_credentials" (
        "id" varchar(21) NOT NULL,
        "provider" varchar(50) NOT NULL,
        "api_key" text NOT NULL,
        "endpoint" varchar(2000) NULL,
        "extra" jsonb NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "provider_credentials_provider_unique" UNIQUE ("provider")
      );
    `)

    this.addSql(`
      CREATE TABLE "cost_logs" (
        "id" varchar(21) NOT NULL,
        "issue_id" varchar(21) NOT NULL,
        "agent" varchar(50) NOT NULL,
        "provider" varchar(50) NOT NULL,
        "model" varchar(255) NOT NULL,
        "input_tokens" integer NOT NULL DEFAULT 0,
        "output_tokens" integer NOT NULL DEFAULT 0,
        "cost" decimal(10,6) NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "cost_logs_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "cost_logs_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE
      );
    `)
    this.addSql(`CREATE INDEX "cost_logs_issue_id_idx" ON "cost_logs" ("issue_id");`)
    this.addSql(`CREATE INDEX "cost_logs_agent_idx" ON "cost_logs" ("agent");`)
    this.addSql(`CREATE INDEX "cost_logs_created_at_idx" ON "cost_logs" ("created_at");`)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "cost_logs" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "provider_credentials" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "agent_configurations" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "agent_outputs" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "agents" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "issues" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "users" CASCADE;`)
  }
}
