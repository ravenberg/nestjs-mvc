import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  StandardSchemaValidationPipe,
  type INestApplication,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  MvcModule,
  ROOT_ERROR_KEY,
  View,
  ViewService,
  flattenIssues,
  standardSchemaExceptionFactory,
  type StandardSchemaIssue,
} from '../src/index'

/**
 * A hand-rolled Standard Schema, so the suite needs no Zod: the spec is just an
 * object with a `~standard.validate` returning `{ value }` or `{ issues }`.
 */
const contactSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate(value: unknown) {
      const input = (value ?? {}) as { user?: { name?: string; email?: string }; tags?: string[] }
      const issues: StandardSchemaIssue[] = []
      if (!input.user?.name) issues.push({ message: 'Required', path: ['user', 'name'] })
      if (!input.user?.email?.includes('@')) issues.push({ message: 'Invalid email', path: ['user', { key: 'email' }] })
      if (input.tags?.some((tag) => !tag)) issues.push({ message: 'Empty tag', path: ['tags', 0] })
      if (input.user?.name === 'dup') issues.push({ message: 'Second message, ignored', path: ['user', 'name'] })
      return issues.length ? { issues } : { value: input }
    },
  },
}

describe('flattenIssues', () => {
  it('joins Standard Schema paths into dot keys, keeping the first message per key', () => {
    expect(
      flattenIssues([
        { message: 'Required', path: ['user', 'name'] },
        { message: 'Also required', path: ['user', 'name'] },
        { message: 'Invalid email', path: ['user', { key: 'email' }] },
        { message: 'Empty tag', path: ['tags', 0] },
        { message: 'Whole form is off' },
      ]),
    ).toEqual({
      'user.name': 'Required',
      'user.email': 'Invalid email',
      'tags.0': 'Empty tag',
      [ROOT_ERROR_KEY]: 'Whole form is off',
    })
  })

  it('is wrapped by an exceptionFactory that carries the errors typed, not stringified', () => {
    const exception = standardSchemaExceptionFactory([{ message: 'Required', path: ['name'] }])
    expect(exception.errors).toEqual({ name: 'Required' })
    expect(exception.getStatus()).toBe(400)
  })
})

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
    void body
    return this.view.redirect('/contacts/create')
  }

  @Post('without-factory')
  withoutFactory() {
    // What StandardSchemaValidationPipe throws when no exceptionFactory is given.
    throw new BadRequestException(['user.email: Invalid email', 'user.name: Required', 'user.name: Ignored'])
  }

  @Post('grouped')
  grouped() {
    // What ValidationPipe({ errorFormat: 'grouped' }) throws.
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: { 'user.name': ['Required', 'Too short'], email: ['Invalid email'] },
    })
  }
}

describe('Standard Schema validation (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1' })],
      controllers: [FormsController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory: standardSchemaExceptionFactory }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const inertia = (req: request.Test) => req.set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')
  const flashCookie = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('mvc_flash='))?.split(';')[0]

  async function errorsAfter(post: request.Test): Promise<Record<string, string>> {
    const res = await post
    expect(res.status).toBe(302)
    const back = await inertia(request(app.getHttpServer()).get('/contacts/create')).set('Cookie', flashCookie(res)!)
    return back.body.props.errors
  }

  it('validates @Body({ schema }) and delivers dot-keyed errors through the redirect-back flow', async () => {
    const errors = await errorsAfter(
      inertia(request(app.getHttpServer()).post('/contacts').set('Referer', '/contacts/create')).send({
        user: { name: '', email: 'nope' },
        tags: [''],
      }),
    )

    expect(errors).toEqual({ 'user.name': 'Required', 'user.email': 'Invalid email', 'tags.0': 'Empty tag' })
  })

  it('lets a valid body through to the handler', async () => {
    const res = await inertia(request(app.getHttpServer()).post('/contacts')).send({
      user: { name: 'Ada', email: 'ada@example.com' },
      tags: ['x'],
    })

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/contacts/create')
    expect(flashCookie(res)).toBeUndefined()
  })

  it('still understands the pipe’s default "path: message" list without a factory', async () => {
    const errors = await errorsAfter(inertia(request(app.getHttpServer()).post('/without-factory')))
    expect(errors).toEqual({ 'user.email': 'Invalid email', 'user.name': 'Required' })
  })

  it('understands ValidationPipe({ errorFormat: "grouped" })', async () => {
    const errors = await errorsAfter(inertia(request(app.getHttpServer()).post('/grouped')))
    expect(errors).toEqual({ 'user.name': 'Required', email: 'Invalid email' })
  })

  it('keeps the regular 400 JSON, with typed errors, for non-Inertia requests', async () => {
    const res = await request(app.getHttpServer()).post('/contacts').send({ user: {} })
    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual({ 'user.name': 'Required', 'user.email': 'Invalid email' })
  })
})
