import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

// The same docs app on Fastify: the in-process Vite dev server, server
// rendering and hot reload in development (`pnpm dev:fastify`), and the built
// assets through @fastify/static in production. Keeps the "Using Fastify"
// docs page honest.
const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())

if (process.env.NODE_ENV === 'production') {
  // Registered and awaited directly: NestJS 12's app.useStaticAssets() on
  // Fastify does not wait for the plugin, and listen() then never finishes.
  const root = join(fileURLToPath(new URL('..', import.meta.url)), 'dist/client')
  await app.register(fastifyStatic, { root, prefix: '/build/' })
}

const port = Number(process.env.PORT) || 3001
await app.listen(port)
console.log(`Docs running on Fastify at http://localhost:${port}`)
