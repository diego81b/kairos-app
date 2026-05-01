import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { EntityManager } from '@mikro-orm/postgresql'
import { nanoid } from 'nanoid'
import * as crypto from 'crypto'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { RefreshTokenEntity } from '../../../domain/entities/RefreshTokenEntity'
import { hashPassword, verifyPassword } from '../../../infrastructure/security/PasswordHasher'
import { ConflictException, UnauthorizedException, NotFoundException } from '../../../shared/errors'
import type { AuthResponse, TokenResponse, UserResponse } from '../../http/responses/auth/AuthResponse'
import type { JwtPayload } from './jwt.strategy'

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const existing = await this.em.findOne(UserEntity, { email })
    if (existing) throw new ConflictException(`Email '${email}' is already registered`)

    const user = new UserEntity()
    user.email = email
    user.password = await hashPassword(password)
    user.name = name

    this.em.persist(user)
    await this.em.flush()

    const tokens = await this.generateTokens(user)
    return { ...tokens, user: this.toUserResponse(user) }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.em.findOne(UserEntity, { email })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const valid = await verifyPassword(password, user.password)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    const tokens = await this.generateTokens(user)
    return { ...tokens, user: this.toUserResponse(user) }
  }

  async refresh(rawToken: string): Promise<TokenResponse> {
    const hashed = this.hashToken(rawToken)
    const record = await this.em.findOne(
      RefreshTokenEntity,
      { token: hashed, revokedAt: null },
      { populate: ['user'] },
    )

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }

    // Rotate: revoke old, issue new
    record.revokedAt = new Date()
    const tokens = await this.generateTokens(record.user)
    await this.em.flush()

    return tokens
  }

  async logout(rawToken: string): Promise<void> {
    const hashed = this.hashToken(rawToken)
    const record = await this.em.findOne(RefreshTokenEntity, { token: hashed })
    if (record) {
      record.revokedAt = new Date()
      await this.em.flush()
    }
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.em.findOne(UserEntity, { id: userId })
    if (!user) throw new NotFoundException('User', userId)
    return this.toUserResponse(user)
  }

  private async generateTokens(user: UserEntity): Promise<TokenResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwtService.sign(payload)

    const rawRefresh = nanoid(64)
    const expiresDays = this.config.get<number>('jwt.refreshExpiresDays') ?? 7
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresDays)

    const refreshRecord = new RefreshTokenEntity()
    refreshRecord.user = user
    refreshRecord.token = this.hashToken(rawRefresh)
    refreshRecord.expiresAt = expiresAt

    this.em.persist(refreshRecord)
    await this.em.flush()

    return { accessToken, refreshToken: rawRefresh }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  private toUserResponse(user: UserEntity): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspace: user.workspace,
    }
  }
}
