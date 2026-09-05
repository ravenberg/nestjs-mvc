import { Controller, Get, Inject, NotFoundException, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { MvcModule, View, ViewService, type MvcModuleOptions } from '../src/index'

@Controller()
class PagesController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('home')
  @View('Home')
  home() {
    this.view.share('auth', { user: 'lee' }).share({ locale: 'nl', 'nav.items': [] })
    return { title: 'Home' }
  }

  @Get('bare')
  @View('Bare')
  bare() {
    return { title: 'Bare' }
  }

  @Get('missing')
  missing() {
    this.view.share('auth', { user: 'lee' })
    throw new NotFoundException()
  }
}

describe('sharedProps metadata', () => {
  let app: INestApplication

  async function boot(options: MvcModuleOptions = {}) {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', ...options })],
      controllers: [PagesController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()
  }

  afterEach(async () => {
    await app?.close()
  })

  const visit = (path: string) =>
    request(app.getHttpServer()).get(path).set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')

  it('lists the top-level keys of the shared props, once each', async () => {
    await boot()
    const res = await visit('/home')
    expect(res.body.sharedProps).toEqual(['auth', 'locale', 'nav'])
    expect(res.body.props.title).toBe('Home')
  })

  it('omits the field when nothing is shared', async () => {
    await boot()
    expect((await visit('/bare')).body.sharedProps).toBeUndefined()
  })

  it('can be switched off, matching Laravel’s expose_shared_prop_keys', async () => {
    await boot({ exposeSharedProps: false })
    expect((await visit('/home')).body.sharedProps).toBeUndefined()
  })

  it('still lists them on a partial reload', async () => {
    await boot()
    const res = await visit('/home').set('X-Inertia-Partial-Component', 'Home').set('X-Inertia-Partial-Data', 'title')
    expect(res.body.sharedProps).toEqual(['auth', 'locale', 'nav'])
  })

  it('follows the error page’s shared setting', async () => {
    await boot({ errorPages: ({ status }) => ({ component: 'Errors/Show', props: { status }, shared: true }) })
    expect((await visit('/missing')).body.sharedProps).toEqual(['auth'])
    await app.close()

    await boot({ errorPages: ({ status }) => ({ component: 'Errors/Show', props: { status } }) })
    expect((await visit('/missing')).body.sharedProps).toBeUndefined()
  })
})
