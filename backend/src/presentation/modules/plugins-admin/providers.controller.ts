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
  Query,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../infrastructure/http/guards/JwtAuthGuard'
import { RolesGuard } from '../../../infrastructure/http/guards/RolesGuard'
import { Roles } from '../../../infrastructure/http/decorators/roles.decorator'
import { ok } from '../../http/responses/ApiResponse'
import { PluginsAdminService } from './plugins-admin.service'
import type { CreateProviderDto, UpdateProviderDto } from './plugins-admin.dto'
import type { JwtPayload } from '../auth/jwt.strategy'

interface AuthenticatedRequest {
  user: JwtPayload
}

// ─────────────────────────────────────────────────────────────────────────────
// Providers  GET/POST /admin/providers
//            GET/PATCH/DELETE /admin/providers/:id
//            POST /admin/providers/:id/test
// ─────────────────────────────────────────────────────────────────────────────

@Controller('admin/providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ProvidersController {
  constructor(private readonly service: PluginsAdminService) {}

  @Get()
  async list() {
    return ok(await this.service.listProviders())
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return ok(await this.service.getProvider(id))
  }

  @Post()
  async create(@Body() body: CreateProviderDto) {
    return ok(await this.service.createProvider(body))
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateProviderDto) {
    return ok(await this.service.updateProvider(id, body))
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.service.deleteProvider(id)
  }

  /** Test that the current user's credential for this provider is reachable. */
  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async test(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return ok(await this.service.testProviderConnection(id, req.user.sub))
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugins  GET /admin/plugins[?type=provider|agent|tool]
//          GET /admin/plugins/:id
//          POST /admin/plugins/sync  (re-trigger discovery)
// ─────────────────────────────────────────────────────────────────────────────

@Controller('admin/plugins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PluginsController {
  constructor(private readonly service: PluginsAdminService) {}

  @Get()
  async list(@Query('type') type?: string) {
    return ok(await this.service.listPlugins(type))
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return ok(await this.service.getPlugin(id))
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync() {
    return ok(await this.service.triggerSync())
  }
}
