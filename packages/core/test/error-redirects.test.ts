import { Controller, Get, HttpException, Inject, Post, Put, type INestApplication } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import {
  MvcModule,
  PAGE_EXPIRED_MESSAGE,
  ROOT_ERROR_KEY,
  ValidationException,
  View,
  ViewService,
  type MvcModuleOptions,
} from '../src/index'

@Controller()
class PagesController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('form')
  @View('Form')
  form() {
    return {}
  }

  @Post('save')
  save() {
    return this.view.flash('message', 'Saved').back()
  }

  @Post('limited')
  limited() {
    throw new HttpException('Too Many Requests', 429)
  }

  @Put('limited')
  limitedPut() {
    throw new HttpException('Too Many Requests', 429)
  }

  @Get('limited')
  limitedGet() {
    throw new HttpException('Too Many Requests', 429)
  }

  @Post('queued')
  queued() {
    this.view.flash('note', 'queued before the error')
    throw new HttpException('Too Many Requests', 429)
  }

  @Post('gone')
  gone() {
    throw new HttpException('Page expired', 419)
  }

  @Post('flash-then-invalid')
  flashThenInvalid() {
    this.view.flash('note', 'flashed before the validation failed')
    throw new ValidationException({ name: 'Required.' })
  }
}

type Platform = 'express' | 'fastify'
const HOST = 'app.test'
const KEY = 'error-redirects-key-'.padEnd(43, 'e')

const slowDown: MvcModuleOptions['errorPages'] = ({ status }) =>
  status === 429 ? { redirect: 'back', flash: { message: 'Slow down.' } } : undefined

async function boot(platform: Platform, options: MvcModuleOptions = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [MvcModule.forRoot({ version: 'v1', keys: [KEY], ...options })],
    controllers: [PagesController],
  }).compile()
  const app =
    platform === 'fastify'
      ? moduleRef.createNestApplication(new FastifyAdapter() as never, { logger: false })
      : moduleRef.createNestApplication({ logger: false })
  await app.init()
  if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
  return app
}

const cookies = (res: request.Response): string[] => (res.headers['set-cookie'] as unknown as string[] | undefined) ?? []
const cookie = (res: request.Response, name: string) => cookies(res).find((c) => c.startsWith(`${name}=`))?.split(';')[0]

describe.each<Platform>(['express', 'fastify'])('errorPages redirects (%s)', (platform) => {
  let app: INestApplication
  afterEach(async () => {
    await app?.close()
  })

  const visit = (test: request.Test) =>
    test.set('Host', HOST).set('X-Inertia', 'true').set('X-Inertia-Version', 'v1').set('Referer', `http://${HOST}/form`)
  const render = (flashCookie: string | undefined) =>
    visit(request(app.getHttpServer()).get('/form')).set('Cookie', flashCookie ?? '')

  it('sends the visitor back with the flash message instead of an error', async () => {
    app = await boot(platform, { errorPages: slowDown })
    const res = await visit(request(app.getHttpServer()).post('/limited'))
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe(`http://${HOST}/form`)
    expect((await render(cookie(res, 'mvc_flash'))).body.flash).toEqual({ message: 'Slow down.' })
  })

  it('answers 303 after PUT, as every redirect does', async () => {
    app = await boot(platform, { errorPages: slowDown })
    expect((await visit(request(app.getHttpServer()).put('/limited'))).status).toBe(303)
  })

  it('redirects to a path, and never follows a Referer from another site', async () => {
    app = await boot(platform, {
      errorPages: ({ status }) => (status === 429 ? { redirect: '/pricing' } : undefined),
    })
    expect((await visit(request(app.getHttpServer()).post('/limited'))).headers.location).toBe('/pricing')
    await app.close()

    app = await boot(platform, { errorPages: slowDown })
    const foreign = await visit(request(app.getHttpServer()).post('/limited')).set('Referer', 'https://evil.example/')
    expect(foreign.headers.location).toBe('/')
  })

  it('delivers errors like a failed validation, into the form’s error bag', async () => {
    app = await boot(platform, {
      errorPages: ({ status }) => (status === 429 ? { redirect: 'back', errors: { email: 'Too many attempts.' } } : undefined),
    })
    const plain = await visit(request(app.getHttpServer()).post('/limited'))
    expect((await render(cookie(plain, 'mvc_flash'))).body.props.errors).toEqual({ email: 'Too many attempts.' })

    const bagged = await visit(request(app.getHttpServer()).post('/limited')).set('X-Inertia-Error-Bag', 'login')
    expect((await render(cookie(bagged, 'mvc_flash'))).body.props.errors).toEqual({ login: { email: 'Too many attempts.' } })
  })

  it('keeps what the handler flashed before it threw', async () => {
    app = await boot(platform, { errorPages: slowDown })
    const res = await visit(request(app.getHttpServer()).post('/queued'))
    expect((await render(cookie(res, 'mvc_flash'))).body.flash).toEqual({ note: 'queued before the error', message: 'Slow down.' })
  })

  it('keeps validation errors when the handler flashed first (the Express redirect patch once rewrote the bag)', async () => {
    app = await boot(platform)
    const res = await visit(request(app.getHttpServer()).post('/flash-then-invalid'))
    const page = await render(cookie(res, 'mvc_flash'))
    expect(page.body.props.errors).toEqual({ name: 'Required.' })
    expect(page.body.flash).toEqual({ note: 'flashed before the validation failed' })
  })

  it('works for a first load too, not only for Inertia visits', async () => {
    app = await boot(platform, { errorPages: slowDown })
    const res = await request(app.getHttpServer()).get('/limited').set('Host', HOST).set('Referer', `http://${HOST}/form`)
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe(`http://${HOST}/form`)
  })
})

describe.each<Platform>(['express', 'fastify'])('a CSRF 419 by default (%s)', (platform) => {
  let app: INestApplication
  afterEach(async () => {
    await app?.close()
  })

  const post = (path = '/save') =>
    request(app.getHttpServer())
      .post(path)
      .set('Host', HOST)
      .set('Sec-Fetch-Site', 'same-origin')
      .set('Referer', `http://${HOST}/form`)
  const inertia = (test: request.Test) => test.set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')

  it('sends an Inertia visit back with "page expired" and a fresh token, so the retry works', async () => {
    app = await boot(platform, { csrf: true })
    const expired = await inertia(post())
    expect(expired.status).toBe(302)
    expect(expired.headers.location).toBe(`http://${HOST}/form`)

    const token = decodeURIComponent(cookie(expired, 'XSRF-TOKEN')!.slice('XSRF-TOKEN='.length))
    const flash = cookie(expired, 'mvc_flash')!
    const page = await inertia(request(app.getHttpServer()).get('/form')).set('Cookie', `${flash}; XSRF-TOKEN=${token}`)
    expect(page.body.flash).toEqual({ message: PAGE_EXPIRED_MESSAGE })
    // Also a form-level error: without one the client would call onSuccess and reset the form.
    expect(page.body.props.errors).toEqual({ [ROOT_ERROR_KEY]: PAGE_EXPIRED_MESSAGE })

    const retry = await inertia(post()).set('Cookie', `XSRF-TOKEN=${token}`).set('X-XSRF-TOKEN', token)
    expect(retry.status).toBe(302)
    expect((await inertia(request(app.getHttpServer()).get('/form')).set('Cookie', cookie(retry, 'mvc_flash')!)).body.flash).toEqual({
      message: 'Saved',
    })
  })

  it('keeps the 419 for JSON clients and Precognition, which cannot follow a redirect to a page', async () => {
    app = await boot(platform, { csrf: true })
    expect((await post()).status).toBe(419)
    expect((await inertia(post()).set('Precognition', 'true')).status).toBe(419)
  })

  it('leaves a 419 the app threw itself to Nest', async () => {
    app = await boot(platform, { csrf: false })
    expect((await inertia(post('/gone'))).status).toBe(419)
  })

  it('lets errorPages answer the 419 its own way', async () => {
    app = await boot(platform, {
      csrf: true,
      errorPages: ({ status }) => (status === 419 ? { redirect: '/form', flash: { message: 'Sessie verlopen.' } } : undefined),
    })
    const res = await inertia(post())
    expect(res.headers.location).toBe('/form')
    expect((await inertia(request(app.getHttpServer()).get('/form')).set('Cookie', cookie(res, 'mvc_flash')!)).body.flash).toEqual({
      message: 'Sessie verlopen.',
    })
  })
})
