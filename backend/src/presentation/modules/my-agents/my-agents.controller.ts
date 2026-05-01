import { Controller, Get, Put, Post, Param, Body, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../../../infrastructure/http/guards/JwtAuthGuard'
import { MyAgentsService } from './my-agents.service'
import { UpsertMyAgentConfigDto } from './my-agents.dto'
import { CreateMyAgentDto } from './create-my-agent.dto'
import { ok } from '../../http/responses/ApiResponse'
import type { JwtPayload } from '../auth/jwt.strategy'

interface AuthenticatedRequest {
  user: JwtPayload
}

@Controller('me/agents')
@UseGuards(JwtAuthGuard)
export class MyAgentsController {
  constructor(private readonly service: MyAgentsService) {}

  /**
   * GET /me/agents
   * Returns all global active agents with the user's config for each (null if not configured).
   */
  @Get()
  async listAgents(@Request() req: AuthenticatedRequest) {
    const result = await this.service.listAgentsForUser(req.user.sub)
    return ok(result)
  }

  /**
   * GET /me/agents/all
   * Returns all agents visible to the user: global active + their own private agents.
   */
  @Get('all')
  async listAllAgents(@Request() req: AuthenticatedRequest) {
    const result = await this.service.listAllAgentsForUser(req.user.sub)
    return ok(result)
  }

  /**
   * POST /me/agents
   * Create a new private agent for the user.
   */
  @Post()
  async createAgent(@Body() dto: CreateMyAgentDto, @Request() req: AuthenticatedRequest) {
    const result = await this.service.createMyAgent(req.user.sub, dto)
    return ok(result)
  }

  /**
   * GET /me/agents/:agentId/config
   * Returns the user's configuration for a specific agent.
   */
  @Get(':agentId/config')
  async getConfig(
    @Param('agentId') agentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.service.getAgentConfig(req.user.sub, agentId)
    return ok(result)
  }

  /**
   * PUT /me/agents/:agentId/config
   * Upserts the user's configuration for a specific agent.
   */
  @Put(':agentId/config')
  async upsertConfig(
    @Param('agentId') agentId: string,
    @Body() dto: UpsertMyAgentConfigDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.service.upsertAgentConfig(req.user.sub, agentId, dto)
    return ok(result)
  }
}
