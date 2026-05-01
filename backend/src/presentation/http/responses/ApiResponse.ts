export interface ApiResponse<T = void> {
  success: boolean
  data?: T
  message?: string
  meta?: Record<string, unknown>
}

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { success: true, data, meta }
}

export function fail(message: string): ApiResponse<never> {
  return { success: false, message }
}
