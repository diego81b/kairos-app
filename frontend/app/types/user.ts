export type UserRole = 'ADMIN' | 'USER' | 'VIEWER'

export interface ManagedUser {
  id: string
  email: string
  name?: string
  role: UserRole
  workspace: string
  createdAt: string
}

export interface CreateUserPayload {
  email: string
  password: string
  name?: string
  role: UserRole
}

export interface UpdateUserPayload {
  name?: string
  role?: UserRole
}
