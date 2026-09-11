import { fileURLToPath } from 'node:url'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

const app = await NestFactory.create<NestExpressApplication>(AppModule)

if (process.env.NODE_ENV === 'production') {
  app.useStaticAssets(fileURLToPath(new URL('../dist/client', import.meta.url)), { prefix: '/build/' })
}

const port = Number(process.env.PORT) || 3001
await app.listen(port)
console.log(`Docs running on http://localhost:${port}`)
