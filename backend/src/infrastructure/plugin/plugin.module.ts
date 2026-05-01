import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AgentEntity } from '../../domain/entities/AgentEntity'
import { AgentPluginBindingEntity } from '../../domain/entities/AgentPluginBindingEntity'
import { LlmProviderCredentialsEntity } from '../../domain/entities/LlmProviderCredentialsEntity'
import { PluginEntity } from '../../domain/entities/PluginEntity'
import { LlmProviderEntity } from '../../domain/entities/LlmProviderEntity'
import { PluginAuditLogEntity } from '../../domain/entities/PluginAuditLogEntity'
import { UserAgentConfigurationEntity } from '../../domain/entities/UserAgentConfigurationEntity'
import { PluginRegistry } from './PluginRegistry'
import { ProviderResolutionService } from './ProviderResolutionService'
import { PluginDiscoveryService } from './PluginDiscoveryService'
import { PluginDbSyncService } from './PluginDbSyncService'
import { PluginAuditService } from './PluginAuditService'
import { LocalPackageSecurityPolicy } from './LocalPackageSecurityPolicy'

@Module({
  imports: [
    MikroOrmModule.forFeature([
      AgentEntity,
      AgentPluginBindingEntity,
      LlmProviderCredentialsEntity,
      PluginEntity,
      LlmProviderEntity,
      PluginAuditLogEntity,
      UserAgentConfigurationEntity,
    ]),
  ],
  providers: [PluginRegistry, ProviderResolutionService, PluginDiscoveryService, PluginDbSyncService, PluginAuditService, LocalPackageSecurityPolicy],
  exports: [PluginRegistry, ProviderResolutionService, PluginDiscoveryService, PluginDbSyncService, PluginAuditService, LocalPackageSecurityPolicy],
})
export class PluginModule {}
