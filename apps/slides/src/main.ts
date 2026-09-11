import { fileURLToPath } from 'node:url'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'

const app = await NestFactory.create<NestExpressApplication>(AppModule)

// Illustrations referenced from the decks (content/illustrations/*.svg), same URL in dev and production.
app.useStaticAssets(fileURLToPath(new URL('../content/illustrations', import.meta.url)), { prefix: '/illustrations/' })

if (process.env.NODE_ENV === 'production') {
  app.useStaticAssets(fileURLToPath(new URL('../dist/client', import.meta.url)), { prefix: '/build/' })
}

const port = Number(process.env.PORT) || 3002
await app.listen(port)
console.log(`Slides running on http://localhost:${port}`)
