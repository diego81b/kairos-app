import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { JwtModule } from '@nestjs/jwt'
import { EnvConfig } from './infrastructure/config/EnvConfig'
import { UserEntity } from './domain/entities/UserEntity'
import { RefreshTokenEntity } from './domain/entities/RefreshTokenEntity'
import { IssueEntity } from './domain/entities/IssueEntity'
import { AgentEntity } from './domain/entities/AgentEntity'
import { AgentOutputEntity } from './domain/entities/AgentOutputEntity'
import { AgentConfigurationEntity } from './domain/entities/AgentConfigurationEntity'
import { ProviderCredentialsEntity } from './domain/entities/ProviderCredentialsEntity'
import { CostLogEntity } from './domain/entities/CostLogEntity'
import { LlmProviderEntity } from './domain/entities/LlmProviderEntity'
import { LlmProviderCredentialsEntity } from './domain/entities/LlmProviderCredentialsEntity'
import { PluginEntity } from './domain/entities/PluginEntity'
import { AgentPluginBindingEntity } from './domain/entities/AgentPluginBindingEntity'
import { PluginAuditLogEntity } from './domain/entities/PluginAuditLogEntity'
import { UserAgentConfigurationEntity } from './domain/entities/UserAgentConfigurationEntity'
import { AuthModule } from './presentation/modules/auth/auth.module'
import { PluginModule } from './infrastructure/plugin/plugin.module'
import { PluginsAdminModule } from './presentation/modules/plugins-admin/plugins-admin.module'
import { MyAgentsModule } from './presentation/modules/my-agents/my-agents.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [EnvConfig],
    }),

    MikroOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        driver: require('@mikro-orm/postgresql').PostgreSqlDriver,
        host: config.get('database.host'),
        port: config.get('database.port'),
        user: config.get('database.user'),
        password: config.get('database.password'),
        dbName: config.get('database.name'),
        entities: [
          UserEntity,
          RefreshTokenEntity,
          IssueEntity,
          AgentEntity,
          AgentOutputEntity,
          AgentConfigurationEntity,
          ProviderCredentialsEntity,
          CostLogEntity,
          LlmProviderEntity,
          LlmProviderCredentialsEntity,
          PluginEntity,
          AgentPluginBindingEntity,
          PluginAuditLogEntity,
          UserAgentConfigurationEntity,
        ],
        migrations: {
          path: 'src/infrastructure/persistence/migrations',
          glob: '!(*.d).{js,ts}',
          transactional: true,
          allOrNothing: true,
          safe: true,
          emit: 'ts',
        },
        debug: config.get('nodeEnv') === 'development',
      }),
    }),

    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn') },
      }),
    }),

    AuthModule,
    PluginModule,
    PluginsAdminModule,
    MyAgentsModule,
  ],
})
export class AppModule {}
