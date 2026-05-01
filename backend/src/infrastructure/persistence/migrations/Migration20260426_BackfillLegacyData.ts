import { Migration } from '@mikro-orm/migrations'

/**
 * PR5 — Backfill migration
 *
 * This migration is intentionally a no-op for new databases.
 *
 * For existing databases that have legacy tables (provider_credentials, agent_configurations),
 * this migration would backfill data into the new plugin-system tables.
 *
 * Since this is a fresh setup, all necessary data is seeded via DefaultAgentSeeder
 * and built-in provider setup via BuiltInPluginSeeder.
 *
 * If needed in the future, the backfill logic can be re-enabled by uncommenting the SQL below.
 */
export class Migration20260426_BackfillLegacyData extends Migration {
  async up(): Promise<void> {
    // No-op: New databases don't have legacy tables to backfill from.
    // Seeding is handled by DefaultAgentSeeder and BuiltInPluginSeeder instead.
  }

  async down(): Promise<void> {
    // No-op (inverse of up)
  }
}
