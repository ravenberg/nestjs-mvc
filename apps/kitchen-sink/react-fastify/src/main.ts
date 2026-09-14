import { fileURLToPath } from 'node:url'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { StandardSchemaValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { standardSchemaExceptionFactory } from 'nestjs-mvc'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())

  // Validates every `@Body({ schema })` and hands field errors to the
  // redirect-back flow keyed by dot path. Needs no emitDecoratorMetadata.
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))

  // Multipart bodies for the File Uploads page (see upload.controller.ts).
  await app.register(fastifyMultipart, { limits: { fileSize: 2 * 1024 * 1024 } })

  if (process.env.NODE_ENV === 'production') {
    // Registered and awaited directly: NestJS 12's app.useStaticAssets() on
    // Fastify does not wait for the plugin, and listen() then never finishes.
    await app.register(fastifyStatic, { root: fileURLToPath(new URL('../dist/client', import.meta.url)), prefix: '/build/' })
  }

  const port = Number(process.env.PORT) || 3002
  await app.listen(port)
  console.log(`Kitchen sink (React on Fastify) running on http://localhost:${port}`)
}

bootstrap()
