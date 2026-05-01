import { HttpException, HttpStatus } from '@nestjs/common'

export class DomainException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super({ success: false, message }, status)
  }
}

export class NotFoundException extends HttpException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`
    super({ success: false, message }, HttpStatus.NOT_FOUND)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super({ success: false, message }, HttpStatus.UNAUTHORIZED)
  }
}

export class ConflictException extends HttpException {
  constructor(message: string) {
    super({ success: false, message }, HttpStatus.CONFLICT)
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super({ success: false, message }, HttpStatus.FORBIDDEN)
  }
}
