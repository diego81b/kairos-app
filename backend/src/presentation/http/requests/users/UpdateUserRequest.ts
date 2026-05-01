import { IsIn, IsOptional, IsString } from 'class-validator'
import type { UserRole } from '../../../../shared/types'

export class UpdateUserRequest {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsIn(['ADMIN', 'USER', 'VIEWER'])
  role?: UserRole
}
