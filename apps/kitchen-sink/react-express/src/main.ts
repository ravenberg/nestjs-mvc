import { fileURLToPath } from 'node:url'
import { StandardSchemaValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { standardSchemaExceptionFactory } from 'nestjs-mvc'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Validates every `@Body({ schema })` and hands field errors to the
  // redirect-back flow keyed by dot path. Needs no emitDecoratorMetadata.
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))

  if (process.env.NODE_ENV === 'production') {
    app.useStaticAssets(fileURLToPath(new URL('../dist/client', import.meta.url)), { prefix: '/build/' })
  }

  const port = Number(process.env.PORT) || 3000
  await app.listen(port)
  console.log(`Kitchen sink (React on Express) running on http://localhost:${port}`)
}

bootstrap()
