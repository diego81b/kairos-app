import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { MikroOrmModule } from '@mikro-orm/nestjs'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { RefreshTokenEntity } from '../../../domain/entities/RefreshTokenEntity'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './jwt.strategy'

@Module({
  imports: [
    PassportModule,
    MikroOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
