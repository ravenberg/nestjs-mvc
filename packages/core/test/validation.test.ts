import 'reflect-metadata'
import { BadRequestException, Body, Controller, Get, Post, Res, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { Response } from 'express'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { View, MvcModule, flattenValidationErrors, validationExceptionFactory } from '../src/index'

@Controller()
class FormsController {
  @Get('/users/create')
  @View('Users/Create')
  create() {
    return { title: 'New user' }
  }

  @Post('/users')
  store(@Body('email') email: string, @Res() res: Response) {
    if (!email?.includes('@')) {
      throw validationExceptionFactory([
        { property: 'email', constraints: { isEmail: 'email must be an email' }, children: [] },
      ])
    }
    res.redirect('/users/create')
  }

  @Post('/legacy')
  legacy() {
    // Default ValidationPipe shape: message array, field name prefixed.
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: ['email must be an email', 'email should not be empty', 'name should not be empty'],
    })
  }

  @Post('/opaque')
  opaque() {
    throw new BadRequestException('something else entirely')
  }
}

describe('validation errors (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot()],
      controllers: [FormsController],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const errorsCookie = (res: request.Response): string | undefined =>
    (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('mvc_flash='))

  it('redirects back with flashed errors on an Inertia visit', async () => {
    const res = await request(app.getHttpServer())
      .post('/users')
      .set('X-Inertia', 'true')
      .set('Referer', '/users/create')
      .send({ email: 'nope' })

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/users/create')
    const cookie = errorsCookie(res)
    expect(cookie).toBeDefined()
    expect(decodeURIComponent(cookie!)).toContain('email must be an email')
  })

  it('delivers flashed errors as the errors prop and clears the cookie', async () => {
    const flash = await request(app.getHttpServer())
      .post('/users')
      .set('X-Inertia', 'true')
      .set('Referer', '/users/create')
      .send({})

    const cookie = errorsCookie(flash)!.split(';')[0]
    const res = await request(app.getHttpServer()).get('/users/create').set('X-Inertia', 'true').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.props.errors).toEqual({ email: 'email must be an email' })
    // Cleared: expires in the past
    expect(errorsCookie(res)).toContain('Expires=Thu, 01 Jan 1970')
  })

  it('shares an empty errors object when nothing was flashed', async () => {
    const res = await request(app.getHttpServer()).get('/users/create').set('X-Inertia', 'true')
    expect(res.body.props.errors).toEqual({})
  })

  it('scopes errors under the bag from X-Inertia-Error-Bag', async () => {
    const flash = await request(app.getHttpServer())
      .post('/users')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Error-Bag', 'createUser')
      .set('Referer', '/users/create')
      .send({})

    const cookie = errorsCookie(flash)!.split(';')[0]
    const res = await request(app.getHttpServer()).get('/users/create').set('X-Inertia', 'true').set('Cookie', cookie)

    expect(res.body.props.errors).toEqual({ createUser: { email: 'email must be an email' } })
  })

  it('extracts field errors from the default ValidationPipe message array', async () => {
    const res = await request(app.getHttpServer())
      .post('/legacy')
      .set('X-Inertia', 'true')
      .set('Referer', '/legacy-form')

    expect(res.status).toBe(302)
    const cookie = decodeURIComponent(errorsCookie(res)!)
    expect(cookie).toContain('"email":"email must be an email"')
    expect(cookie).toContain('"name":"name should not be empty"')
  })

  it('falls through to the default 400 response for non-View requests', async () => {
    const res = await request(app.getHttpServer()).post('/users').send({})

    expect(res.status).toBe(400)
    expect(res.body.errors).toEqual({ email: 'email must be an email' })
    expect(errorsCookie(res)).toBeUndefined()
  })

  it('falls through when no field errors can be extracted', async () => {
    const res = await request(app.getHttpServer()).post('/opaque').set('X-Inertia', 'true')

    expect(res.status).toBe(400)
    expect(res.body.message).toBe('something else entirely')
  })
})

describe('flattenValidationErrors', () => {
  it('flattens nested errors with dot notation and keeps the first constraint', () => {
    expect(
      flattenValidationErrors([
        { property: 'email', constraints: { isEmail: 'email must be an email', isNotEmpty: 'ignored' } },
        {
          property: 'address',
          children: [{ property: 'zip', constraints: { isNotEmpty: 'address.zip should not be empty' } }],
        },
      ]),
    ).toEqual({
      email: 'email must be an email',
      'address.zip': 'address.zip should not be empty',
    })
  })
})
