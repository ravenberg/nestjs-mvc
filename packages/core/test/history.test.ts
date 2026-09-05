import { Controller, Get, Inject, Post, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import { EncryptHistory, MvcModule, View, ViewService, type MvcModuleOptions } from '../src/index'

@Controller()
class PagesController {
  constructor(@Inject(ViewService) private readonly view: ViewService) {}

  @Get('home')
  @View('Home')
  home() {
    return {}
  }

  @Get('settings')
  @View('Settings')
  @EncryptHistory()
  settings() {
    return {}
  }

  @Get('public-report')
  @View('Report')
  @EncryptHistory(false)
  report() {
    return {}
  }

  @Get('runtime')
  @View('Runtime')
  runtime() {
    this.view.encryptHistory()
    return {}
  }

  @Get('logout-now')
  @View('Login')
  logoutNow() {
    this.view.clearHistory()
    return {}
  }

  @Post('logout')
  logout() {
    return this.view.clearHistory().redirect('/login')
  }

  @Get('login')
  @View('Login')
  login() {
    return {}
  }
}

@Controller('vault')
@EncryptHistory()
class VaultController {
  @Get()
  @View('Vault/Index')
  index() {
    return {}
  }

  @Get('about')
  @View('Vault/About')
  @EncryptHistory(false)
  about() {
    return {}
  }
}

describe('history encryption and clearing', () => {
  let app: INestApplication

  async function boot(options: MvcModuleOptions = {}) {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', ...options })],
      controllers: [PagesController, VaultController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()
  }

  afterEach(async () => {
    await app?.close()
  })

  const visit = (path: string) =>
    request(app.getHttpServer()).get(path).set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')

  it('emits neither field by default', async () => {
    await boot()
    const res = await visit('/home')
    expect(res.body.encryptHistory).toBeUndefined()
    expect(res.body.clearHistory).toBeUndefined()
  })

  it('follows @EncryptHistory() on a handler and on a controller, with handler opt-out', async () => {
    await boot()
    expect((await visit('/settings')).body.encryptHistory).toBe(true)
    expect((await visit('/vault')).body.encryptHistory).toBe(true)
    expect((await visit('/vault/about')).body.encryptHistory).toBeUndefined()
    expect((await visit('/home')).body.encryptHistory).toBeUndefined()
  })

  it('takes the module default, which a handler can switch off', async () => {
    await boot({ history: { encrypt: true } })
    expect((await visit('/home')).body.encryptHistory).toBe(true)
    expect((await visit('/public-report')).body.encryptHistory).toBeUndefined()
  })

  it('lets ViewService.encryptHistory() decide for one request', async () => {
    await boot()
    expect((await visit('/runtime')).body.encryptHistory).toBe(true)
  })

  it('clears history on the same render when asked during the request', async () => {
    await boot()
    expect((await visit('/logout-now')).body.clearHistory).toBe(true)
    expect((await visit('/logout-now').set('Cookie', 'mvc_flash=')).body.clearHistory).toBe(true)
  })

  it('carries clearHistory across the logout redirect, once', async () => {
    await boot()
    const logout = await request(app.getHttpServer()).post('/logout').set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')
    expect(logout.status).toBe(302)
    const cookie = (logout.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('mvc_flash='))!.split(';')[0]

    const login = await visit('/login').set('Cookie', cookie)
    expect(login.body.clearHistory).toBe(true)

    const again = await visit('/login')
    expect(again.body.clearHistory).toBeUndefined()
  })
})
