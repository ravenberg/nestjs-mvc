import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  Put,
  StandardSchemaValidationPipe,
  UsePipes,
  type INestApplication,
  type PipeTransform,
} from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MvcModule, View, ViewService, standardSchemaExceptionFactory, type StandardSchemaIssue } from '../src/index'

const contactSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate(value: unknown) {
      const input = (value ?? {}) as { user?: { name?: string; email?: string } }
      const issues: StandardSchemaIssue[] = []
      if (!input.user?.name) issues.push({ message: 'Required', path: ['user', 'name'] })
      if (!input.user?.email?.includes('@')) issues.push({ message: 'Invalid email', path: ['user', 'email'] })
      return issues.length ? { issues } : { value: input }
    },
  },
}

/** A pipe with a side effect, to prove `@UsePipes()` chains are honoured. */
class UppercasePipe implements PipeTransform {
  transform(value: unknown) {
    return typeof value === 'string' ? value.toUpperCase() : value
  }
}

const handled = vi.fn()

@Controller()
class FormsController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('contacts/create')
  @View('Contacts/Create')
  create() {
    return {}
  }

  @Post('contacts')
  store(@Body({ schema: contactSchema }) body: unknown) {
    handled(body)
    return this.view.redirect('/contacts/create')
  }

  @Post('shout')
  @UsePipes(UppercasePipe)
  shout(@Body('word') word: string) {
    handled(word)
    return { word }
  }

  @Put('contacts/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body({ schema: contactSchema }) body: unknown) {
    handled(id, body)
    return this.view.redirect('/contacts/create')
  }
}

const platforms: [string, () => unknown][] = [
  ['express', () => undefined],
  ['fastify', () => new FastifyAdapter()],
]

describe.each(platforms)('precognition (%s)', (platform, adapter) => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1' })],
      controllers: [FormsController],
    }).compile()
    const instance = adapter()
    app = instance
      ? moduleRef.createNestApplication(instance as never, { logger: false })
      : moduleRef.createNestApplication({ logger: false })
    app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))
    await app.init()
    if (platform === 'fastify') await app.getHttpAdapter().getInstance().ready()
  })

  beforeEach(() => handled.mockClear())

  afterAll(async () => {
    await app.close()
  })

  const precognitive = (req: request.Test) => req.set('Precognition', 'true').set('X-Inertia', 'true')

  it('answers 204 + Precognition-Success when the inputs pass, without running the handler', async () => {
    const res = await precognitive(request(app.getHttpServer()).post('/contacts')).send({
      user: { name: 'Ada', email: 'ada@example.com' },
    })

    expect(res.status).toBe(204)
    expect(res.headers.precognition).toBe('true')
    expect(res.headers['precognition-success']).toBe('true')
    expect(res.headers.vary).toContain('Precognition')
    expect(handled).not.toHaveBeenCalled()
  })

  it('answers 422 with field errors when they do not, without running the handler', async () => {
    const res = await precognitive(request(app.getHttpServer()).post('/contacts')).send({ user: { name: '' } })

    expect(res.status).toBe(422)
    expect(res.headers.precognition).toBe('true')
    expect(res.headers['precognition-success']).toBeUndefined()
    expect(res.body.errors).toEqual({ 'user.name': 'Required', 'user.email': 'Invalid email' })
    expect(handled).not.toHaveBeenCalled()
  })

  it('narrows the reported errors to Precognition-Validate-Only, nested paths included', async () => {
    const res = await precognitive(request(app.getHttpServer()).post('/contacts'))
      .set('Precognition-Validate-Only', 'user.email')
      .send({ user: { name: '', email: 'nope' } })

    expect(res.status).toBe(422)
    expect(res.body.errors).toEqual({ 'user.email': 'Invalid email' })

    const parent = await precognitive(request(app.getHttpServer()).post('/contacts'))
      .set('Precognition-Validate-Only', 'user')
      .send({ user: { name: '', email: 'nope' } })
    expect(Object.keys(parent.body.errors).sort()).toEqual(['user.email', 'user.name'])
  })

  it('reports success when the only field asked about is fine, even if others are not', async () => {
    const res = await precognitive(request(app.getHttpServer()).post('/contacts'))
      .set('Precognition-Validate-Only', 'user.name')
      .send({ user: { name: 'Ada', email: 'nope' } })

    expect(res.status).toBe(204)
    expect(res.headers['precognition-success']).toBe('true')
  })

  it('runs @UsePipes() and parameter pipes, exactly as the real request would', async () => {
    const res = await precognitive(request(app.getHttpServer()).post('/shout')).send({ word: 'hi' })
    expect(res.status).toBe(204)
    expect(handled).not.toHaveBeenCalled()

    const real = await request(app.getHttpServer()).post('/shout').send({ word: 'hi' })
    expect(real.body).toEqual({ word: 'HI' })
    expect(handled).toHaveBeenCalledWith('HI')
  })

  it('lets a pipe failure without field errors surface as the usual 400', async () => {
    const res = await precognitive(request(app.getHttpServer()).put('/contacts/not-a-number')).send({
      user: { name: 'Ada', email: 'ada@example.com' },
    })

    expect(res.status).toBe(400)
    expect(handled).not.toHaveBeenCalled()
  })

  it('leaves ordinary requests alone, apart from Vary: Precognition', async () => {
    const res = await request(app.getHttpServer())
      .post('/contacts')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .send({ user: { name: 'Ada', email: 'ada@example.com' } })

    expect(res.status).toBe(302)
    expect(res.headers.vary).toContain('Precognition')
    expect(handled).toHaveBeenCalledOnce()
  })

  it('keeps X-Inertia in Vary on page renders next to Precognition', async () => {
    const res = await request(app.getHttpServer())
      .get('/contacts/create')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')

    expect(res.headers.vary).toContain('X-Inertia')
    expect(res.headers.vary).toContain('Precognition')
  })
})
