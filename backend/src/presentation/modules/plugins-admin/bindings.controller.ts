import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../infrastructure/http/guards/JwtAuthGuard'
import { ok } from '../../http/responses/ApiResponse'
import { PluginsAdminService } from './plugins-admin.service'
import type { CreateBindingDto, UpdateBindingDto } from './plugins-admin.dto'
import type { JwtPayload } from '../auth/jwt.strategy'

interface AuthenticatedRequest {
  user: JwtPayload
}

// ─────────────────────────────────────────────────────────────────────────────
// Bindings  GET  /agents/:agentId/bindings
//           POST /agents/:agentId/bindings
//           PATCH /agents/:agentId/bindings/:bindingId
//           DELETE /agents/:agentId/bindings/:bindingId
//           POST /agents/:agentId/bindings/resolve  (dry-run resolution)
// ─────────────────────────────────────────────────────────────────────────────

@Controller('agents/:agentId/bindings')
@UseGuards(JwtAuthGuard)
export class BindingsController {
  constructor(private readonly service: PluginsAdminService) {}

  @Get()
  async list(@Param('agentId') agentId: string) {
    return ok(await this.service.listBindings(agentId))
  }

  @Post()
  async create(@Param('agentId') agentId: string, @Body() body: CreateBindingDto) {
    return ok(await this.service.createBinding(agentId, body))
  }

  @Patch(':bindingId')
  async update(
    @Param('agentId') agentId: string,
    @Param('bindingId') bindingId: string,
    @Body() body: UpdateBindingDto,
  ) {
    return ok(await this.service.updateBinding(agentId, bindingId, body))
  }

  @Delete(':bindingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('agentId') agentId: string, @Param('bindingId') bindingId: string) {
    await this.service.deleteBinding(agentId, bindingId)
  }

  /**
   * Dry-run model resolution for an agent without executing an LLM call.
   * Useful for UI preview of which model will be used.
   */
  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(@Param('agentId') agentId: string, @Request() req: AuthenticatedRequest) {
    return ok(await this.service.dryRunResolve(agentId, req.user.sub))
  }
}
