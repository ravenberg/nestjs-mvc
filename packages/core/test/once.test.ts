import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MvcModule, View, once, resolveProps } from '../src/index'

const partial = (only: string[]) => ({ only, except: [] })

describe('once() props', () => {
  it('resolves on the first visit and describes itself under onceProps', async () => {
    const { props, onceProps } = await resolveProps({ countries: once(() => ['NL', 'BE']) }, null)

    expect(props.countries).toEqual(['NL', 'BE'])
    expect(onceProps).toEqual({ countries: { prop: 'countries', expiresAt: null } })
  })

  it('skips the closure and the prop when the client already holds the key, but keeps the metadata', async () => {
    const closure = vi.fn(() => ['NL', 'BE'])

    const { props, onceProps } = await resolveProps({ countries: once(closure), name: 'x' }, null, {
      loadedOnce: ['countries'],
    })

    expect(closure).not.toHaveBeenCalled()
    expect(props).toEqual({ name: 'x' })
    // The client fills its copy back in only because the key is still announced.
    expect(onceProps).toEqual({ countries: { prop: 'countries', expiresAt: null } })
  })

  it('shares one cache entry across pages through `as`', async () => {
    const closure = vi.fn(() => ['NL'])

    const first = await resolveProps({ options: once(closure, { as: 'countries' }) }, null)
    expect(first.onceProps).toEqual({ countries: { prop: 'options', expiresAt: null } })

    const second = await resolveProps({ choices: once(closure, { as: 'countries' }) }, null, {
      loadedOnce: ['countries'],
    })
    expect(closure).toHaveBeenCalledOnce()
    expect(second.props.choices).toBeUndefined()
    expect(second.onceProps).toEqual({ countries: { prop: 'choices', expiresAt: null } })
  })

  it('turns `until` into an absolute expiry in epoch milliseconds', async () => {
    const before = Date.now()
    const { onceProps } = await resolveProps(
      {
        ttl: once(() => 1, { until: 300 }),
        fixed: once(() => 1, { until: new Date('2030-01-01T00:00:00Z') }),
      },
      null,
    )

    expect(onceProps.ttl.expiresAt).toBeGreaterThanOrEqual(before + 300_000)
    expect(onceProps.ttl.expiresAt).toBeLessThanOrEqual(Date.now() + 300_000)
    expect(onceProps.fixed.expiresAt).toBe(Date.UTC(2030, 0, 1))
  })

  it('resolves again when marked fresh, whatever the client says', async () => {
    const closure = vi.fn(() => ['NL', 'BE', 'DE'])

    const { props } = await resolveProps({ countries: once(closure, { fresh: true }) }, null, {
      loadedOnce: ['countries'],
    })

    expect(closure).toHaveBeenCalledOnce()
    expect(props.countries).toEqual(['NL', 'BE', 'DE'])
  })

  it('resolves again on an explicit partial reload, and only then announces the key', async () => {
    const closure = vi.fn(() => ['NL'])
    const raw = () => ({ countries: once(closure), other: 1 })

    const asked = await resolveProps(raw(), partial(['countries']), { loadedOnce: ['countries'] })
    expect(closure).toHaveBeenCalledOnce()
    expect(asked.props.countries).toEqual(['NL'])
    expect(asked.onceProps).toEqual({ countries: { prop: 'countries', expiresAt: null } })

    const notAsked = await resolveProps(raw(), partial(['other']), { loadedOnce: ['countries'] })
    expect(closure).toHaveBeenCalledOnce()
    expect(notAsked.props).toEqual({ other: 1 })
    expect(notAsked.onceProps).toEqual({})
  })

  it('works at any depth, keyed by dot path unless `as` says otherwise', async () => {
    const closure = vi.fn(() => ['admin'])
    const raw = () => ({ auth: { user: 'lee', permissions: once(closure) } })

    const first = await resolveProps(raw(), null)
    expect(first.onceProps).toEqual({ 'auth.permissions': { prop: 'auth.permissions', expiresAt: null } })

    const second = await resolveProps(raw(), null, { loadedOnce: ['auth.permissions'] })
    expect(closure).toHaveBeenCalledOnce()
    expect(second.props).toEqual({ auth: { user: 'lee' } })
  })

  it('keeps nothing between requests, even for a once() instance hoisted out of the handler', async () => {
    // A module-level `once()` is shared by every request in the process. It must
    // behave as a pure description: no memoised value, no remembered client.
    const closure = vi.fn(() => Date.now())
    const hoisted = once(closure)

    await resolveProps({ stamp: hoisted }, null)
    await resolveProps({ stamp: hoisted }, null, { loadedOnce: ['stamp'] })
    await resolveProps({ stamp: hoisted }, null)

    // Called on the first and third request, skipped on the second — independently.
    expect(closure).toHaveBeenCalledTimes(2)
  })
})

/** Simulates a hoisted instance in a controller, the riskiest place for shared state. */
const permissions = once(() => ['contacts.read'], { as: 'permissions', until: 60 })

@Controller()
class PagesController {
  @Get('settings')
  @View('Settings')
  settings() {
    return { title: 'Settings', permissions, countries: once(() => ['NL', 'BE']) }
  }
}

describe('once() on the wire (e2e)', () => {
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

  const visit = () =>
    request(app.getHttpServer()).get('/settings').set('X-Inertia', 'true').set('X-Inertia-Version', 'v1')

  it('sends the values and the once metadata on a first visit', async () => {
    const res = await visit()

    expect(res.body.props.countries).toEqual(['NL', 'BE'])
    expect(res.body.props.permissions).toEqual(['contacts.read'])
    expect(res.body.onceProps.countries).toEqual({ prop: 'countries', expiresAt: null })
    expect(res.body.onceProps.permissions).toMatchObject({ prop: 'permissions' })
    expect(typeof res.body.onceProps.permissions.expiresAt).toBe('number')
  })

  it('omits the props the client lists in X-Inertia-Except-Once-Props, keeping the metadata', async () => {
    const res = await visit().set('X-Inertia-Except-Once-Props', 'countries,permissions')

    expect(res.body.props).toEqual({ errors: {}, title: 'Settings' })
    expect(Object.keys(res.body.onceProps).sort()).toEqual(['countries', 'permissions'])
  })

  it('does not let one client’s header leak into the next request', async () => {
    await visit().set('X-Inertia-Except-Once-Props', 'countries,permissions')
    const res = await visit()

    expect(res.body.props.countries).toEqual(['NL', 'BE'])
    expect(res.body.props.permissions).toEqual(['contacts.read'])
  })

  it('serves everything on a plain page load, where no header exists', async () => {
    const res = await request(app.getHttpServer()).get('/settings')

    expect(res.text).toContain('"countries":["NL","BE"]')
    expect(res.text).toContain('"onceProps"')
  })
})
