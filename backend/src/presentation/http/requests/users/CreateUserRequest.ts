import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator'
import type { UserRole } from '../../../../shared/types'

export class CreateUserRequest {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string

  @IsOptional()
  @IsString()
  name?: string

  @IsIn(['ADMIN', 'USER', 'VIEWER'])
  role!: UserRole
}
