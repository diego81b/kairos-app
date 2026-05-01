import { Migration } from '@mikro-orm/migrations'

export class Migration20260501_AgentOutputsToObjectStorage extends Migration {
  async up(): Promise<void> {
    // Drop large TEXT/JSONB blob columns — content moves to MinIO object storage.
    // Rows with existing data are dropped intentionally: outputs have no content yet.
    this.addSql(`ALTER TABLE "agent_outputs" DROP COLUMN IF EXISTS "output_data";`)
    this.addSql(`ALTER TABLE "agent_outputs" DROP COLUMN IF EXISTS "output_markdown";`)

    // Add reference columns pointing to the object in MinIO.
    // storage_key format: {issueId}/{agentType}/v{version}.json
    this.addSql(`ALTER TABLE "agent_outputs" ADD COLUMN "storage_key" varchar(500) NULL;`)
    this.addSql(`ALTER TABLE "agent_outputs" ADD COLUMN "storage_provider" varchar(50) NOT NULL DEFAULT 'minio';`)
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "agent_outputs" DROP COLUMN IF EXISTS "storage_key";`)
    this.addSql(`ALTER TABLE "agent_outputs" DROP COLUMN IF EXISTS "storage_provider";`)
    this.addSql(`ALTER TABLE "agent_outputs" ADD COLUMN "output_data" jsonb NULL;`)
    this.addSql(`ALTER TABLE "agent_outputs" ADD COLUMN "output_markdown" text NULL;`)
  }
}
