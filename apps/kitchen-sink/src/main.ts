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

  await app.listen(3000)
  console.log('Demo running on http://localhost:3000')
}

bootstrap()
