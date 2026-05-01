import { Module } from '@nestjs/common'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { AgentEntity } from '../../../domain/entities/AgentEntity'
import { UserAgentConfigurationEntity } from '../../../domain/entities/UserAgentConfigurationEntity'
import { LlmProviderEntity } from '../../../domain/entities/LlmProviderEntity'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { MyAgentsService } from './my-agents.service'
import { MyAgentsController } from './my-agents.controller'

@Module({
  imports: [
    MikroOrmModule.forFeature([
      AgentEntity,
      UserAgentConfigurationEntity,
      LlmProviderEntity,
      UserEntity,
    ]),
  ],
  providers: [MyAgentsService],
  controllers: [MyAgentsController],
})
export class MyAgentsModule {}
