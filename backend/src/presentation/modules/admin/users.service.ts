import { Injectable } from '@nestjs/common'
import { EntityManager } from '@mikro-orm/postgresql'
import { UserEntity } from '../../../domain/entities/UserEntity'
import { hashPassword } from '../../../infrastructure/security/PasswordHasher'
import { ConflictException, ForbiddenException, NotFoundException } from '../../../shared/errors'
import type { CreateUserRequest } from '../../http/requests/users/CreateUserRequest'
import type { UpdateUserRequest } from '../../http/requests/users/UpdateUserRequest'
import type { UserListResponse } from '../../http/responses/users/UserListResponse'

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async listUsers(workspace: string): Promise<UserListResponse[]> {
    const users = await this.em.findAll(UserEntity, { where: { workspace }, orderBy: { createdAt: 'ASC' } })
    return users.map(this.toResponse)
  }

  async createUser(dto: CreateUserRequest, workspace: string): Promise<UserListResponse> {
    const existing = await this.em.findOne(UserEntity, { email: dto.email })
    if (existing) throw new ConflictException(`Email '${dto.email}' is already registered`)

    const user = new UserEntity()
    user.email = dto.email
    user.password = await hashPassword(dto.password)
    user.name = dto.name
    user.role = dto.role
    user.workspace = workspace

    this.em.persist(user)
    await this.em.flush()

    return this.toResponse(user)
  }

  async updateUser(id: string, dto: UpdateUserRequest): Promise<UserListResponse> {
    const user = await this.em.findOne(UserEntity, { id })
    if (!user) throw new NotFoundException('User', id)

    if (dto.name !== undefined) user.name = dto.name
    if (dto.role !== undefined) user.role = dto.role

    await this.em.flush()
    return this.toResponse(user)
  }

  async deleteUser(id: string, requestingUserId: string): Promise<void> {
    if (id === requestingUserId) {
      throw new ForbiddenException('You cannot delete your own account')
    }

    const user = await this.em.findOne(UserEntity, { id })
    if (!user) throw new NotFoundException('User', id)

    await this.em.removeAndFlush(user)
  }

  private toResponse(user: UserEntity): UserListResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspace: user.workspace,
      createdAt: user.createdAt,
    }
  }
}
