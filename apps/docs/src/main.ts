import './env'
import { fileURLToPath } from 'node:url'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

const app = await NestFactory.create<NestExpressApplication>(AppModule)
// In production the app runs behind a reverse proxy (Caddy), which knows the
// visitor's protocol and host.
app.set('trust proxy', 1)

if (process.env.NODE_ENV === 'production') {
  app.useStaticAssets(fileURLToPath(new URL('../dist/client', import.meta.url)), { prefix: '/build/' })
}

const port = Number(process.env.PORT) || 3001
await app.listen(port)
console.log(`Docs running on http://localhost:${port}`)
