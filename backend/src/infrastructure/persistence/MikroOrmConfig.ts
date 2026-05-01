import { defineConfig } from '@mikro-orm/postgresql'
import * as dotenv from 'dotenv'
import { UserEntity } from '../../domain/entities/UserEntity'
import { RefreshTokenEntity } from '../../domain/entities/RefreshTokenEntity'
import { IssueEntity } from '../../domain/entities/IssueEntity'
import { AgentEntity } from '../../domain/entities/AgentEntity'
import { AgentOutputEntity } from '../../domain/entities/AgentOutputEntity'
import { AgentConfigurationEntity } from '../../domain/entities/AgentConfigurationEntity'
import { UserAgentConfigurationEntity } from '../../domain/entities/UserAgentConfigurationEntity'
import { ProviderCredentialsEntity } from '../../domain/entities/ProviderCredentialsEntity'
import { CostLogEntity } from '../../domain/entities/CostLogEntity'
import { LlmProviderEntity } from '../../domain/entities/LlmProviderEntity'
import { LlmProviderCredentialsEntity } from '../../domain/entities/LlmProviderCredentialsEntity'
import { PluginEntity } from '../../domain/entities/PluginEntity'
import { AgentPluginBindingEntity } from '../../domain/entities/AgentPluginBindingEntity'
import { PluginAuditLogEntity } from '../../domain/entities/PluginAuditLogEntity'

dotenv.config()

export default defineConfig({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  dbName: process.env.DB_NAME || 'kairos_dev',
  entities: [
    UserEntity,
    RefreshTokenEntity,
    IssueEntity,
    AgentEntity,
    AgentOutputEntity,
    AgentConfigurationEntity,
    UserAgentConfigurationEntity,
    ProviderCredentialsEntity,
    CostLogEntity,
    LlmProviderEntity,
    LlmProviderCredentialsEntity,
    PluginEntity,
    AgentPluginBindingEntity,
    PluginAuditLogEntity,
  ],
  migrations: {
    path: './src/infrastructure/persistence/migrations',
    pathTs: './src/infrastructure/persistence/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
    safe: true,
    emit: 'ts',
  },
  seeder: {
    path: './src/infrastructure/persistence/seeders',
    pathTs: './src/infrastructure/persistence/seeders',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{js,ts}',
    emit: 'ts',
  },
  debug: process.env.NODE_ENV === 'development',
})
