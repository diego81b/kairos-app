import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator'

export class RegisterRequest {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string
}
