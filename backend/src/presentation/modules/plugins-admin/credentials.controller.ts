import {
  Controller,
  Get,
  Post,
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
import type { UpsertCredentialDto } from './plugins-admin.dto'
import type { JwtPayload } from '../auth/jwt.strategy'

interface AuthenticatedRequest {
  user: JwtPayload
}

// ─────────────────────────────────────────────────────────────────────────────
// Credentials (user-scoped)
//   GET    /me/provider-credentials
//   POST   /me/provider-credentials        (upsert — create or replace API key)
//   DELETE /me/provider-credentials/:id
// ─────────────────────────────────────────────────────────────────────────────

@Controller('me/provider-credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(private readonly service: PluginsAdminService) {}

  @Get()
  async list(@Request() req: AuthenticatedRequest) {
    return ok(await this.service.listCredentials(req.user.sub))
  }

  /** Creates or replaces the API key for the given provider. */
  @Post()
  @HttpCode(HttpStatus.OK)
  async upsert(@Request() req: AuthenticatedRequest, @Body() body: UpsertCredentialDto) {
    return ok(await this.service.upsertCredential(req.user.sub, body))
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.service.deleteCredential(req.user.sub, id)
  }
}
