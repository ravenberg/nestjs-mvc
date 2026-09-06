import 'reflect-metadata'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  StandardSchemaValidationPipe,
  type INestApplication,
  type PipeTransform,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  MvcModule,
  ValidationException,
  View,
  ViewService,
  createStandardSchemaExceptionFactory,
  createValidationExceptionFactory,
  extractFieldErrors,
  flattenIssues,
  flattenValidationErrors,
  type StandardSchemaIssue,
} from '../src/index'

/** A password rule set where one field fails several rules at once. */
const passwordSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'test',
    validate(value: unknown) {
      const input = (value ?? {}) as { name?: string; password?: string }
      const issues: StandardSchemaIssue[] = []
      if (!input.name) issues.push({ message: 'Required', path: ['name'] })
      const password = input.password ?? ''
      if (password.length < 12) issues.push({ message: 'At least 12 characters', path: ['password'] })
      if (!/\d/.test(password)) issues.push({ message: 'At least one digit', path: ['password'] })
      return issues.length ? { issues } : { value: input }
    },
  },
}

const failing = [
  { message: 'At least 12 characters', path: ['password'] },
  { message: 'At least one digit', path: ['password'] },
  { message: 'Required', path: ['name'] },
]

describe('messages: all', () => {
  it('flattenIssues keeps every message per path as an array, in order', () => {
    expect(flattenIssues(failing, { messages: 'all' })).toEqual({
      password: ['At least 12 characters', 'At least one digit'],
      name: ['Required'],
    })
    // The default is unchanged.
    expect(flattenIssues(failing)).toEqual({ password: 'At least 12 characters', name: 'Required' })
  })

  it('flattenValidationErrors keeps every constraint, nested paths included', () => {
    const tree = [
      {
        property: 'user',
        children: [{ property: 'password', constraints: { minLength: 'too short', matches: 'needs a digit' }, children: [] }],
      },
    ]
    expect(flattenValidationErrors(tree, { messages: 'all' })).toEqual({ 'user.password': ['too short', 'needs a digit'] })
    expect(flattenValidationErrors(tree)).toEqual({ 'user.password': 'too short' })
  })

  it('the factories carry the option', () => {
    expect(createStandardSchemaExceptionFactory({ messages: 'all' })(failing).errors).toEqual({
      password: ['At least 12 characters', 'At least one digit'],
      name: ['Required'],
    })
    expect(
      createValidationExceptionFactory({ messages: 'all' })([
        { property: 'email', constraints: { isEmail: 'not an email', isNotEmpty: 'required' }, children: [] },
      ]).errors,
    ).toEqual({ email: ['not an email', 'required'] })
  })
})

describe('extractFieldErrors with options', () => {
  const grouped = () =>
    new BadRequestException({ statusCode: 400, error: 'Bad Request', message: { password: ['too short', 'no digit'], name: ['required'] } })
  const list = () => new BadRequestException(['password: too short', 'password: no digit', 'name should not be empty'])

  it('reduces Nest’s grouped format per the option', () => {
    expect(extractFieldErrors(grouped())).toEqual({ password: 'too short', name: 'required' })
    expect(extractFieldErrors(grouped(), { messages: 'all' })).toEqual({ password: ['too short', 'no digit'], name: ['required'] })
  })

  it('reduces Nest’s message list per the option', () => {
    expect(extractFieldErrors(list())).toEqual({ password: 'too short', name: 'name should not be empty' })
    expect(extractFieldErrors(list(), { messages: 'all' })).toEqual({
      password: ['too short', 'no digit'],
      name: ['name should not be empty'],
    })
  })

  it('passes a hand-made errors object through untouched, whatever the option', () => {
    const own = new BadRequestException({ errors: { email: ['taken', 'too long'], name: 'required', count: 3, empty: [] } })
    const expected = { email: ['taken', 'too long'], name: 'required' }
    expect(extractFieldErrors(own)).toEqual(expected)
    expect(extractFieldErrors(own, { messages: 'all' })).toEqual(expected)
    expect(extractFieldErrors(new BadRequestException({ errors: { count: 3 } }))).toBeNull()
  })

  it('takes a ValidationException as it is', () => {
    const exception = new ValidationException({ password: ['a', 'b'] })
    expect(extractFieldErrors(exception, { messages: 'first' })).toEqual({ password: ['a', 'b'] })
  })
})

/** What a class-validator pipe with `errorFormat: 'grouped'` throws, from a parameter pipe so precognition runs it. */
class GroupedPipe implements PipeTransform {
  transform(): never {
    throw new BadRequestException({ statusCode: 400, error: 'Bad Request', message: { password: ['too short', 'no digit'] } })
  }
}

@Controller()
class PasswordController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('password')
  @View('Password')
  form() {
    return {}
  }

  @Post('password')
  store(@Body({ schema: passwordSchema }) body: unknown) {
    void body
    return this.view.back()
  }

  @Post('grouped')
  grouped() {
    throw new BadRequestException({ statusCode: 400, error: 'Bad Request', message: { password: ['too short', 'no digit'] } })
  }

  @Post('grouped-pipe')
  groupedPipe(@Body(new GroupedPipe()) body: unknown) {
    void body
    return this.view.back()
  }

  @Post('opaque')
  opaque() {
    throw new BadRequestException('not a validation failure')
  }
}

describe('validation: { messages: "all", jsonStatus: 422 } (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', validation: { messages: 'all', jsonStatus: 422 } })],
      controllers: [PasswordController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    app.useGlobalPipes(
      new StandardSchemaValidationPipe({ exceptionFactory: createStandardSchemaExceptionFactory({ messages: 'all' }) }),
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const inertia = (req: request.Test) => req.set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')
  const flashCookie = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('mvc_flash='))?.split(';')[0]

  async function errorsAfter(post: request.Test) {
    const res = await post
    expect(res.status).toBe(302)
    const back = await inertia(request(app.getHttpServer()).get('/password')).set('Cookie', flashCookie(res)!)
    return back.body.props.errors
  }

  it('delivers arrays of messages through the redirect-back flow', async () => {
    const errors = await errorsAfter(
      inertia(request(app.getHttpServer()).post('/password').set('Referer', '/password')).send({ password: 'short' }),
    )
    expect(errors).toEqual({ name: ['Required'], password: ['At least 12 characters', 'At least one digit'] })
  })

  it('applies the option to Nest’s own grouped format', async () => {
    const errors = await errorsAfter(inertia(request(app.getHttpServer()).post('/grouped').set('Referer', '/password')))
    expect(errors).toEqual({ password: ['too short', 'no digit'] })
  })

  it('answers a non-Inertia validation failure with 422 + { message, errors }', async () => {
    const res = await request(app.getHttpServer()).post('/password').send({ name: 'Ada', password: 'short' })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({
      message: 'The given data was invalid.',
      errors: { password: ['At least 12 characters', 'At least one digit'] },
    })
    expect(flashCookie(res)).toBeUndefined()
  })

  it('leaves a 400 without field errors alone', async () => {
    const res = await request(app.getHttpServer()).post('/opaque')
    expect(res.status).toBe(400)
    expect(res.body.message).toBe('not a validation failure')
  })

  it('reports all messages to a precognitive request, Validate-Only included', async () => {
    const res = await request(app.getHttpServer())
      .post('/password')
      .set('Precognition', 'true')
      .set('Precognition-Validate-Only', 'password')
      .send({ password: 'short' })
    expect(res.status).toBe(422)
    expect(res.body.errors).toEqual({ password: ['At least 12 characters', 'At least one digit'] })
  })

  it('applies the option to a pipe that throws Nest’s grouped format under precognition', async () => {
    const res = await request(app.getHttpServer()).post('/grouped-pipe').set('Precognition', 'true').send({})
    expect(res.status).toBe(422)
    expect(res.body.errors).toEqual({ password: ['too short', 'no digit'] })
  })
})
