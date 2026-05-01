import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'
import { DemoUserSeeder } from './DemoUserSeeder'
import { DefaultAgentSeeder } from './DefaultAgentSeeder'
import { BuiltInPluginSeeder } from './BuiltInPluginSeeder'

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    return this.call(em, [DemoUserSeeder, DefaultAgentSeeder, BuiltInPluginSeeder])
  }
}
