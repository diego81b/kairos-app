import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { LlmProviderEntity } from '../../../domain/entities/LlmProviderEntity'
import { LlmProviderCredentialsEntity } from '../../../domain/entities/LlmProviderCredentialsEntity'
import { PluginEntity } from '../../../domain/entities/PluginEntity'
import { AgentPluginBindingEntity } from '../../../domain/entities/AgentPluginBindingEntity'
import { AgentEntity } from '../../../domain/entities/AgentEntity'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { PluginModule } from '../../../infrastructure/plugin/plugin.module'
import { PluginsAdminService } from './plugins-admin.service'
import { ProvidersController, PluginsController } from './providers.controller'
import { BindingsController } from './bindings.controller'
import { CredentialsController } from './credentials.controller'
import { UsersController } from '../admin/users.controller'
import { UsersService } from '../admin/users.service'
import { RolesGuard } from '../../../infrastructure/http/guards/RolesGuard'

@Module({
  imports: [
    MikroOrmModule.forFeature([
      LlmProviderEntity,
      LlmProviderCredentialsEntity,
      PluginEntity,
      AgentPluginBindingEntity,
      AgentEntity,
      UserEntity,
    ]),
    PluginModule,
  ],
  controllers: [ProvidersController, PluginsController, BindingsController, CredentialsController, UsersController],
  providers: [PluginsAdminService, UsersService, RolesGuard],
})
export class PluginsAdminModule {}
