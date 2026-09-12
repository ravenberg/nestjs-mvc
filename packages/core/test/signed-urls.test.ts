import { Controller, Get, Inject, Param, type INestApplication } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { MvcModule, SignedUrls, ValidSignature, type MvcModuleOptions } from '../src/index'

const KEY = 'signed-urls-test-key-'.padEnd(43, 's')

@Controller()
class LinksController {
  constructor(@Inject(SignedUrls) private readonly links: SignedUrls) {}

  /** Hands out the links the tests then follow. */
  @Get('links')
  make() {
    return {
      plain: this.links.sign('/invitations/7'),
      expiring: this.links.sign('/invitations/7', { expiresIn: 60 }),
      expired: this.links.sign('/invitations/7', { expiresIn: -60 }),
      withQuery: this.links.sign('/invitations/7?team=acme&role=admin', { expiresIn: 60 }),
      bound: this.links.sign('/invitations/7', { bind: 'the-secret' }),
    }
  }

  @Get('invitations/:id')
  @ValidSignature()
  invitation(@Param('id') id: string) {
    return { id }
  }
}

type Platform = 'express' | 'fastify'

async function boot(platform: Platform, options: MvcModuleOptions = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [MvcModule.forRoot({ version: 'v1', keys: [KEY], ...options })],
    controllers: [LinksController],
  }).compile()
  const app =
    platform === 'fastify'
      ? moduleRef.createNestApplication(new FastifyAdapter() as never, { logger: false })
      : moduleRef.createNestApplication({ logger: false })
  await app.init()
  if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
  return app
}

describe.each<Platform>(['express', 'fastify'])('signed URLs (%s)', (platform) => {
  let app: INestApplication
  afterEach(async () => {
    await app?.close()
  })

  const links = async () => (await request(app.getHttpServer()).get('/links')).body as Record<string, string>
  const follow = (url: string) => request(app.getHttpServer()).get(url)

  it('signs a path, and the guard lets it through', async () => {
    app = await boot(platform)
    const { plain, expiring, withQuery } = await links()
    expect(plain).toMatch(/^\/invitations\/7\?signature=[\w-]{43}$/)
    expect((await follow(plain)).status).toBe(200)
    expect((await follow(expiring)).body).toEqual({ id: '7' })
    expect((await follow(withQuery)).status).toBe(200)
  })

  it('refuses a link that was changed, unsigned, or signed by another app', async () => {
    app = await boot(platform)
    const { plain, expiring, withQuery } = await links()

    expect((await follow('/invitations/7')).status).toBe(403)
    expect((await follow(plain.replace('/7', '/8'))).status).toBe(403)
    expect((await follow(`${plain}&admin=1`)).status).toBe(403)
    expect((await follow(withQuery.replace('role=admin', 'role=owner'))).status).toBe(403)
    expect((await follow(plain.replace(/signature=.*/, 'signature=made-up'))).status).toBe(403)
    // The expiry is signed too, so it cannot be pushed forward.
    expect((await follow(expiring.replace(/expires=\d+/, `expires=${Math.floor(Date.now() / 1000) + 9999}`))).status).toBe(403)

    await app.close()
    app = await boot(platform, { keys: ['another-app-key-'.padEnd(43, 'x')] })
    expect((await follow(plain)).status).toBe(403)
  })

  it('refuses a link whose moment has passed, and says so', async () => {
    app = await boot(platform)
    const { expired } = await links()
    const res = await follow(expired)
    expect(res.status).toBe(403)
    expect(res.body.message).toBe('This link has expired.')
  })

  it('does not care in which order the query is written', async () => {
    app = await boot(platform)
    const { withQuery } = await links()
    const url = new URL(withQuery, 'http://app.test')
    const shuffled = `/invitations/7?signature=${url.searchParams.get('signature')}&role=admin&expires=${url.searchParams.get('expires')}&team=acme`
    expect((await follow(shuffled)).status).toBe(200)
  })

  it('makes absolute links when the app knows its url', async () => {
    app = await boot(platform, { url: 'https://app.example.com' })
    const { plain } = await links()
    expect(plain).toMatch(/^https:\/\/app\.example\.com\/invitations\/7\?signature=/)
    // The origin is not signed: the same link works on whatever host answers.
    expect((await follow(new URL(plain).pathname + new URL(plain).search)).status).toBe(200)
  })
})

describe('binding a link to something', () => {
  let app: INestApplication
  const ring = async (options: MvcModuleOptions = {}) => {
    app = await boot('express', options)
    return app.get(SignedUrls)
  }
  afterEach(async () => {
    await app?.close()
  })

  it('only verifies with the same binding, so a link dies when what it belongs to changes', async () => {
    const links = await ring()
    const url = links.sign('/reset/9', { bind: 'password-hash-one' })

    expect(links.verify(url, { bind: 'password-hash-one' })).toBe(true)
    expect(links.verify(url, { bind: 'password-hash-two' })).toBe(false) // the password changed: single use, no token table
    expect(links.verify(url)).toBe(false)
    expect(links.check(url, { bind: 'password-hash-two' })).toBe('invalid')
  })

  it('tells an expired link from a wrong one, and reads a request as well as a string', async () => {
    const links = await ring()
    expect(links.check(links.sign('/x', { expiresIn: -1 }))).toBe('expired')
    expect(links.check(links.sign('/x', { expiresIn: 60 }))).toBe('valid')
    expect(links.check('/x')).toBe('invalid')
    expect(links.check({ headers: {}, url: links.sign('/x', { expiresIn: 60 }) })).toBe('valid')
  })

  it('signs an accepted Date, and replaces a signature that was already there', async () => {
    const links = await ring()
    expect(links.check(links.sign('/x', { expiresIn: new Date(Date.now() + 60_000) }))).toBe('valid')
    expect(links.check(links.sign('/x', { expiresIn: new Date(Date.now() - 60_000) }))).toBe('expired')

    const signed = links.sign('/x')
    expect(links.check(links.sign(`${signed}`))).toBe('valid')
    expect(links.sign(signed).match(/signature=/g)).toHaveLength(1)
  })
})
