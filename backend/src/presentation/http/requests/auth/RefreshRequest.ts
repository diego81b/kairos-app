import { IsString, IsNotEmpty } from 'class-validator'

export class RefreshRequest {
  @IsString()
  @IsNotEmpty()
  refreshToken: string
}
