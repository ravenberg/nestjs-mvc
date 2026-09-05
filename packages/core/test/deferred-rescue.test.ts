import { Controller, Get, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MvcModule, View, defer, resolveProps } from '../src/index'

const partial = (only: string[]) => ({ only, except: [] })
const boom = () => {
  throw new Error('upstream down')
}

describe('defer(fn, { rescue: true })', () => {
  it('leaves a failing rescued prop out, lists its path, and reports the error', async () => {
    const onRescue = vi.fn()
    const raw = { stats: defer(() => ({ users: 1 })), recommendations: defer(boom, { rescue: true }) }

    const { props, rescuedProps } = await resolveProps(raw, partial(['stats', 'recommendations']), { onRescue })

    expect(props).toEqual({ stats: { users: 1 } })
    expect('recommendations' in props).toBe(false) // omitted, not null
    expect(rescuedProps).toEqual(['recommendations'])
    expect(onRescue).toHaveBeenCalledWith(expect.objectContaining({ message: 'upstream down' }), 'recommendations')
  })

  it('still fails the whole response for a deferred prop without rescue', async () => {
    await expect(resolveProps({ stats: defer(boom) }, partial(['stats']))).rejects.toThrow('upstream down')
  })

  it('does not swallow errors from plain or function props', async () => {
    await expect(resolveProps({ stats: () => boom() }, null)).rejects.toThrow('upstream down')
  })

  it('keeps the group when given together with rescue, and still takes a plain group string', async () => {
    const { deferredProps } = await resolveProps(
      { a: defer(() => 1, { group: 'sidebar', rescue: true }), b: defer(() => 2, 'sidebar'), c: defer(() => 3) },
      null,
    )
    expect(deferredProps).toEqual({ sidebar: ['a', 'b'], default: ['c'] })
  })

  it('rescues at any depth, by dot path', async () => {
    const { props, rescuedProps } = await resolveProps(
      { dashboard: { stats: defer(() => 1), feed: defer(boom, { rescue: true }) } },
      partial(['dashboard.stats', 'dashboard.feed']),
    )
    expect(props).toEqual({ dashboard: { stats: 1 } })
    expect(rescuedProps).toEqual(['dashboard.feed'])
  })
})

@Controller()
class DashboardController {
  @Get('dashboard')
  @View('Dashboard')
  dashboard() {
    return {
      title: 'Dashboard',
      stats: defer(() => ({ users: 42 })),
      recommendations: defer(boom, { rescue: true }),
    }
  }
}

describe('rescued deferred props on the wire (e2e)', () => {
  let app: INestApplication
  const onRescue = vi.fn()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1', onRescue })],
      controllers: [DashboardController],
    }).compile()
    app = moduleRef.createNestApplication({ logger: false })
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('announces the rescued prop as deferred on the first visit, like any other', async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')

    expect(res.body.deferredProps).toEqual({ default: ['stats', 'recommendations'] })
    expect(res.body.rescuedProps).toBeUndefined()
    expect(onRescue).not.toHaveBeenCalled()
  })

  it('answers the follow-up with the others, and the failed one under rescuedProps', async () => {
    const res = await request(app.getHttpServer())
      .get('/dashboard')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .set('X-Inertia-Partial-Component', 'Dashboard')
      .set('X-Inertia-Partial-Data', 'stats,recommendations')

    expect(res.status).toBe(200)
    expect(res.body.props.stats).toEqual({ users: 42 })
    expect(res.body.props).not.toHaveProperty('recommendations')
    expect(res.body.rescuedProps).toEqual(['recommendations'])
    expect(onRescue).toHaveBeenCalledWith(expect.any(Error), 'recommendations')
  })
})
