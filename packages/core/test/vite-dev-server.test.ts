import 'reflect-metadata'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Controller, Get, Module, type INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MvcModule, View } from '../src/index'

/** A project with one client module, served by the in-process Vite dev server. */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'nestjs-mvc-dev-'))
  mkdirSync(join(root, 'frontend'))
  writeFileSync(join(root, 'frontend/main.js'), 'console.log("fixture client")\n')
  return root
}

@Controller()
class PagesController {
  @Get()
  @View('Home')
  home() {
    return { hello: 'world' }
  }

  @Get('api/ping')
  ping() {
    return { pong: true }
  }
}

type Platform = 'express' | 'fastify'

describe.each<Platform>(['express', 'fastify'])('the in-process Vite dev server (%s)', (platform) => {
  let app: INestApplication
  let base: string

  beforeAll(async () => {
    const root = fixture()
    @Module({
      imports: [MvcModule.forRoot({ version: 'v1', keys: ['k'.repeat(40)], vite: { root, entry: 'frontend/main.js', dev: true } })],
      controllers: [PagesController],
    })
    class AppModule {}

    app =
      platform === 'fastify'
        ? await NestFactory.create(AppModule, new FastifyAdapter() as never, { logger: false })
        : await NestFactory.create(AppModule, { logger: false })
    await app.listen(0, '127.0.0.1')
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1')
  }, 30_000)

  afterAll(async () => {
    await app?.close()
  })

  const get = (path: string, headers: Record<string, string> = {}) =>
    fetch(base + path, { headers, signal: AbortSignal.timeout(5000) })

  it('renders a page whose HTML Vite has transformed', async () => {
    const res = await get('/', { accept: 'text/html' })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('/@vite/client')
    expect(html).toContain('/frontend/main.js')
  })

  it("serves Vite's own client from the app's port", async () => {
    const res = await get('/@vite/client')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('javascript')
  })

  it('serves and transforms source modules', async () => {
    const res = await get('/frontend/main.js')
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('fixture client')
  })

  it('leaves everything else to Nest', async () => {
    const ping = await get('/api/ping')
    expect(ping.status).toBe(200)
    expect(await ping.json()).toEqual({ pong: true })
    expect((await get('/nope')).status).toBe(404)
  })

  it('accepts the HMR websocket on the same port', async () => {
    const message = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(base.replace('http', 'ws') + '/', 'vite-hmr')
      const timer = setTimeout(() => {
        socket.close()
        reject(new Error('no HMR message within 5 s'))
      }, 5000)
      socket.onmessage = (event) => {
        clearTimeout(timer)
        socket.close()
        resolve(String(event.data))
      }
      socket.onerror = () => {
        clearTimeout(timer)
        reject(new Error('HMR websocket failed'))
      }
    })
    expect(JSON.parse(message)).toMatchObject({ type: 'connected' })
  })
})
