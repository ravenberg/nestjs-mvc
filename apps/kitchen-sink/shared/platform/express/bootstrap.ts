import { join } from 'node:path'
import { StandardSchemaValidationPipe, type Type } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { standardSchemaExceptionFactory } from 'nestjs-mvc'

interface Options {
  /** The app's directory, which holds `dist/client` after `vite build`. */
  root: string
  port: number
  /** Shown in the startup line, e.g. "Vue on Express". */
  name: string
}

/**
 * The `main.ts` of every kitchen-sink app on Express, React and Vue alike.
 * Read it as the `main.ts` of your own app: only the three options come in
 * from outside.
 */
export async function bootstrap(AppModule: Type, { root, port, name }: Options) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Validates every `@Body({ schema })` and hands field errors to the
  // redirect-back flow keyed by dot path. Needs no emitDecoratorMetadata.
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))

  if (process.env.NODE_ENV === 'production') {
    app.useStaticAssets(join(root, 'dist/client'), { prefix: '/build/' })
  }

  const listenOn = Number(process.env.PORT) || port
  await app.listen(listenOn)
  console.log(`Kitchen sink (${name}) running on http://localhost:${listenOn}`)
}
