import 'reflect-metadata'
import { Controller, Get, Inject, Put, Res, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Response } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { View, MvcModule, ViewService, always, defer, merge, optional } from '../src/index'

@Controller()
class PagesController {
  constructor(@Inject(ViewService) private readonly inertia: ViewService) {}

  @Get('/')
  @View('Home')
  home() {
    this.inertia.share('auth', { user: 'raven' })
    return {
      name: 'World',
      // Proves the slash escaping: raw, this would close the script element early.
      bio: '</script><script>alert(1)</script>',
      secret: optional(() => 'hidden'),
      stats: defer(async () => ({ users: 42 })),
      flash: always('hello'),
      feed: merge(() => [1, 2, 3]),
    }
  }

  @Get('/plain')
  plainJson() {
    return { ok: true }
  }

  @Put('/submit')
  submit(@Res() res: Response) {
    res.redirect('/')
  }

  @Get('/external')
  external() {
    this.inertia.location('https://example.com/oauth')
  }
}

describe('Inertia protocol (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1' })],
      controllers: [PagesController],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('serves the HTML shell with the page object in a JSON script element', async () => {
    const res = await request(app.getHttpServer()).get('/')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')

    // v3 embeds the page object in a script element, not a data-page attribute.
    expect(res.text).toContain('<script data-page="app" type="application/json">')
    expect(res.text).toContain('<div id="app"></div>')

    // JSON must be raw inside the script body — HTML entities would break parsing.
    expect(res.text).not.toContain('&quot;')
    expect(res.text).toContain('"component":"Home"')
  })

  it('escapes forward slashes so prop data cannot close the script element', async () => {
    const res = await request(app.getHttpServer()).get('/')

    // The url prop is "/" and must be serialized as "\/".
    expect(res.text).toContain('"url":"\\/"')

    // The bio prop contains a literal </script>; escaped, it must not appear as
    // a real closing tag, so the document still has exactly one page script.
    expect(res.text).toContain('<\\/script>')
    expect(res.text.match(/<\/script>/g)).toHaveLength(1)
  })

  it('exposes a page object the v3 client can parse back', async () => {
    const res = await request(app.getHttpServer()).get('/')

    const match = res.text.match(/<script data-page="app" type="application\/json">(.*?)<\/script>/s)
    expect(match).not.toBeNull()

    // Escaped slashes are still valid JSON, so JSON.parse round-trips them.
    const page = JSON.parse(match![1])
    expect(page.component).toBe('Home')
    expect(page.url).toBe('/')
    expect(page.version).toBe('v1')
    expect(page.props.bio).toBe('</script><script>alert(1)</script>')
  })

  it('serves the JSON page object for Inertia visit', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')

    expect(res.status).toBe(200)
    expect(res.headers['x-inertia']).toBe('true')
    expect(res.headers.vary).toContain('X-Inertia')
    expect(res.body.component).toBe('Home')
    expect(res.body.url).toBe('/')
    expect(res.body.version).toBe('v1')
    expect(res.body.props).toEqual({
      errors: {},
      auth: { user: 'raven' },
      name: 'World',
      bio: '</script><script>alert(1)</script>',
      flash: 'hello',
      feed: [1, 2, 3],
    })
    expect(res.body.deferredProps).toEqual({ default: ['stats'] })
    expect(res.body.mergeProps).toEqual(['feed'])
  })

  it('forces a full visit on version mismatch (409 + X-Inertia-Location)', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'stale')

    expect(res.status).toBe(409)
    expect(res.headers['x-inertia-location']).toContain('/')
  })

  it('resolves only requested props (plus always-props) on partial reload', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .set('X-Inertia-Partial-Component', 'Home')
      .set('X-Inertia-Partial-Data', 'stats')

    expect(res.status).toBe(200)
    expect(res.body.props).toEqual({ errors: {}, stats: { users: 42 }, flash: 'hello' })
    expect(res.body.deferredProps).toBeUndefined()
  })

  it('ignores partial headers targeting a different component', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .set('X-Inertia-Partial-Component', 'Other')
      .set('X-Inertia-Partial-Data', 'secret')

    expect(res.body.props.name).toBe('World')
    expect(res.body.props.secret).toBeUndefined()
  })

  it('omits merge markers when the client sends X-Inertia-Reset', async () => {
    const res = await request(app.getHttpServer())
      .get('/')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .set('X-Inertia-Partial-Component', 'Home')
      .set('X-Inertia-Partial-Data', 'feed')
      .set('X-Inertia-Reset', 'feed')

    expect(res.body.props.feed).toEqual([1, 2, 3])
    expect(res.body.mergeProps).toBeUndefined()
  })

  it('converts 302 to 303 for PUT redirects during Inertia visit', async () => {
    const inertia = await request(app.getHttpServer()).put('/submit').set('X-Inertia', 'true')
    expect(inertia.status).toBe(303)

    const regular = await request(app.getHttpServer()).put('/submit')
    expect(regular.status).toBe(302)
  })

  it('sends 409 + X-Inertia-Location for external redirects during Inertia visit', async () => {
    const res = await request(app.getHttpServer())
      .get('/external')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')

    expect(res.status).toBe(409)
    expect(res.headers['x-inertia-location']).toBe('https://example.com/oauth')
  })

  it('leaves non-View routes untouched', async () => {
    const res = await request(app.getHttpServer()).get('/plain')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(res.headers['x-inertia']).toBeUndefined()
  })
})
