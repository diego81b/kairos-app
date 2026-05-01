import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterRequest } from '../../http/requests/auth/RegisterRequest'
import { LoginRequest } from '../../http/requests/auth/LoginRequest'
import { RefreshRequest } from '../../http/requests/auth/RefreshRequest'
import { JwtAuthGuard } from '../../../infrastructure/http/guards/JwtAuthGuard'
import { ok } from '../../http/responses/ApiResponse'
import type { JwtPayload } from './jwt.strategy'

interface AuthenticatedRequest {
  user: JwtPayload
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterRequest) {
    const result = await this.authService.register(body.email, body.password, body.name)
    return ok(result)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest) {
    const result = await this.authService.login(body.email, body.password)
    return ok(result)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshRequest) {
    const result = await this.authService.refresh(body.refreshToken)
    return ok(result)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: RefreshRequest) {
    await this.authService.logout(body.refreshToken)
    return ok(undefined, { message: 'Logged out' })
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: AuthenticatedRequest) {
    const user = await this.authService.getMe(req.user.sub)
    return ok(user)
  }
}
