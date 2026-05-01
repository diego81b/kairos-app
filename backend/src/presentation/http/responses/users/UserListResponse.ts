import type { UserRole } from '../../../../shared/types'

export interface UserListResponse {
  id: string
  email: string
  name?: string
  role: UserRole
  workspace: string
  createdAt: Date
}
