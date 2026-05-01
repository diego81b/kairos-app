import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from 'minio'
import type { IStorageService } from './IStorageService'

@Injectable()
export class MinioStorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(MinioStorageService.name)
  private readonly client: Client

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      endPoint: config.get<string>('minio.host')!,
      port: config.get<number>('minio.port')!,
      useSSL: config.get<boolean>('minio.useSsl')!,
      accessKey: config.get<string>('minio.accessKey')!,
      secretKey: config.get<string>('minio.secretKey')!,
    })
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucket('kairos-agent-outputs')
  }

  async ensureBucket(bucket: string): Promise<void> {
    const exists = await this.client.bucketExists(bucket)
    if (!exists) {
      await this.client.makeBucket(bucket)
      this.logger.log(`Created bucket: ${bucket}`)
    }
  }

  async put(bucket: string, key: string, body: string): Promise<void> {
    const buf = Buffer.from(body, 'utf8')
    await this.client.putObject(bucket, key, buf, buf.byteLength, { 'Content-Type': 'application/json' })
  }

  async get(bucket: string, key: string): Promise<string> {
    const stream = await this.client.getObject(bucket, key)
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      stream.on('error', reject)
    })
  }

  async delete(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key)
  }
}
