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
import { RolesGuard } from '../../../infrastructure/http/guards/RolesGuard'
import { Roles } from '../../../infrastructure/http/decorators/roles.decorator'
import { ok } from '../../http/responses/ApiResponse'
import { UsersService } from './users.service'
import { CreateUserRequest } from '../../http/requests/users/CreateUserRequest'
import { UpdateUserRequest } from '../../http/requests/users/UpdateUserRequest'
import type { JwtPayload } from '../auth/jwt.strategy'

interface AuthenticatedRequest {
  user: JwtPayload
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Request() req: AuthenticatedRequest) {
    const users = await this.usersService.listUsers('default')
    return ok(users)
  }

  @Post()
  async create(@Body() body: CreateUserRequest, @Request() req: AuthenticatedRequest) {
    const user = await this.usersService.createUser(body, 'default')
    return ok(user)
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateUserRequest) {
    const user = await this.usersService.updateUser(id, body)
    return ok(user)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.usersService.deleteUser(id, req.user.sub)
  }
}
