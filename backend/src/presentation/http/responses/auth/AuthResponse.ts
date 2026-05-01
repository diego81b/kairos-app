import type { UserRole } from '../../../../shared/types'

export interface UserResponse {
  id: string
  email: string
  name?: string
  role: UserRole
  workspace: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: UserResponse
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
}
