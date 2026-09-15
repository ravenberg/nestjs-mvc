import { join } from 'node:path'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { StandardSchemaValidationPipe, type Type } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { standardSchemaExceptionFactory } from 'nestjs-mvc'

interface Options {
  /** The app's directory, which holds `dist/client` after `vite build`. */
  root: string
  port: number
  /** Shown in the startup line, e.g. "Vue on Fastify". */
  name: string
}

/**
 * The `main.ts` of every kitchen-sink app on Fastify, React and Vue alike.
 * Read it as the `main.ts` of your own app: only the three options come in
 * from outside.
 */
export async function bootstrap(AppModule: Type, { root, port, name }: Options) {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())

  // Validates every `@Body({ schema })` and hands field errors to the
  // redirect-back flow keyed by dot path. Needs no emitDecoratorMetadata.
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))

  // Multipart bodies for the File Uploads page (see upload.controller.ts).
  await app.register(fastifyMultipart, { limits: { fileSize: 2 * 1024 * 1024 } })

  if (process.env.NODE_ENV === 'production') {
    // Registered and awaited directly: NestJS 12's app.useStaticAssets() on
    // Fastify does not wait for the plugin, and listen() then never finishes.
    await app.register(fastifyStatic, { root: join(root, 'dist/client'), prefix: '/build/' })
  }

  const listenOn = Number(process.env.PORT) || port
  await app.listen(listenOn)
  console.log(`Kitchen sink (${name}) running on http://localhost:${listenOn}`)
}
