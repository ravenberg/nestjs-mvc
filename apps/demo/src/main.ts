import 'reflect-metadata'
import { fileURLToPath } from 'node:url'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  if (process.env.NODE_ENV === 'production') {
    app.useStaticAssets(fileURLToPath(new URL('../dist/client', import.meta.url)), { prefix: '/build/' })
  }

  await app.listen(3000)
  console.log('Demo running on http://localhost:3000')
}

bootstrap()
