export const STORAGE_SERVICE = Symbol('IStorageService')

export interface IStorageService {
  put(bucket: string, key: string, body: string): Promise<void>
  get(bucket: string, key: string): Promise<string>
  delete(bucket: string, key: string): Promise<void>
  ensureBucket(bucket: string): Promise<void>
}
