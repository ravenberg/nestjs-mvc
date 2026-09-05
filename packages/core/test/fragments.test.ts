import { Controller, Get, Inject, Post, Res, type INestApplication } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import type { Response } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MvcModule, View, ViewService } from '../src/index'

@Controller()
class PagesController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('settings')
  @View('Settings')
  settings() {
    return {}
  }

  @Post('settings/password')
  password() {
    return this.view.flash('message', 'Password changed.').redirect('/settings#security')
  }

  @Post('settings/profile')
  profile() {
    return this.view.preserveFragment().flash('message', 'Profile saved.').back()
  }

  @Get('preserve-now')
  @View('Settings')
  preserveNow() {
    this.view.preserveFragment()
    return {}
  }
}

@Controller()
class ExpressController {
  @Post('legacy')
  legacy(@Res() res: Response) {
    res.redirect('/settings#legacy')
  }
}

const platforms: [string, () => unknown][] = [
  ['express', () => undefined],
  ['fastify', () => new FastifyAdapter()],
]

describe.each(platforms)('fragments (%s)', (platform, adapter) => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1' })],
      controllers: platform === 'express' ? [PagesController, ExpressController] : [PagesController],
    }).compile()
    const instance = adapter()
    app = instance
      ? moduleRef.createNestApplication(instance as never, { logger: false })
      : moduleRef.createNestApplication({ logger: false })
    await app.init()
    if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app.close()
  })

  const inertia = (req: request.Test) => req.set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')
  const flashCookie = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('mvc_flash='))?.split(';')[0]

  it('answers a redirect to a URL with a fragment with 409 + X-Inertia-Redirect, keeping the flash', async () => {
    const res = await inertia(request(app.getHttpServer()).post('/settings/password'))

    expect(res.status).toBe(409)
    expect(res.headers['x-inertia-redirect']).toBe('/settings#security')
    expect(res.headers.location).toBeUndefined()
    expect(decodeURIComponent(flashCookie(res)!)).toContain('Password changed.')
  })

  it('redirects normally for a plain request, or a prefetch', async () => {
    const plain = await request(app.getHttpServer()).post('/settings/password')
    expect(plain.status).toBe(302)
    expect(plain.headers.location).toBe('/settings#security')

    const prefetch = await inertia(request(app.getHttpServer()).post('/settings/password')).set('Purpose', 'prefetch')
    expect(prefetch.status).toBe(302)
    expect(prefetch.headers.location).toBe('/settings#security')
  })

  it('carries preserveFragment across the redirect back, once', async () => {
    const post = await inertia(request(app.getHttpServer()).post('/settings/profile').set('Referer', '/settings'))
    expect(post.status).toBe(302)
    expect(post.headers.location).toBe('/settings')

    const next = await inertia(request(app.getHttpServer()).get('/settings')).set('Cookie', flashCookie(post)!)
    expect(next.body.preserveFragment).toBe(true)
    expect(next.body.flash).toEqual({ message: 'Profile saved.' })

    const after = await inertia(request(app.getHttpServer()).get('/settings'))
    expect(after.body.preserveFragment).toBeUndefined()
  })

  it('emits preserveFragment on the same render when asked during the request', async () => {
    const res = await inertia(request(app.getHttpServer()).get('/preserve-now'))
    expect(res.body.preserveFragment).toBe(true)
  })

  if (platform === 'express') {
    it('handles a direct res.redirect() to a fragment URL the same way', async () => {
      const res = await inertia(request(app.getHttpServer()).post('/legacy'))
      expect(res.status).toBe(409)
      expect(res.headers['x-inertia-redirect']).toBe('/settings#legacy')
    })
  }
})
