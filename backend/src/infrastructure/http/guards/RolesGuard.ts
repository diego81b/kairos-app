import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { ForbiddenException } from '../../../shared/errors'
import type { UserRole } from '../../../shared/types'
import type { JwtPayload } from '../../../presentation/modules/auth/jwt.strategy'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>()
    const user = request.user

    if (!required.includes(user?.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return true
  }
}
