import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'test' }),
  )

  const config = app.get(ConfigService)
  const port = config.get<number>('api.port') ?? 3001
  const host = config.get<string>('api.host') ?? '0.0.0.0'
  const frontendUrl = config.get<string>('api.frontendUrl') ?? 'http://localhost:3000'

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  })

  app.setGlobalPrefix('api')

  // Health check
  app.getHttpAdapter().get('/health', (_req: unknown, res: { send: (body: object) => void }) => {
    res.send({ status: 'ok', timestamp: new Date().toISOString() })
  })

  await app.listen(port, host)
  console.log(`🚀 KAIROS API running on http://${host}:${port}`)
}

bootstrap()
