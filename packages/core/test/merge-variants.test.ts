import { Controller, Get, Query, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MvcModule, View, deepMerge, merge, prepend, resolveProps, scroll } from '../src/index'

const partial = (only: string[]) => ({ only, except: [] })
const labels = ({ mergeProps, prependProps, deepMergeProps, matchPropsOn }: Awaited<ReturnType<typeof resolveProps>>) => ({
  mergeProps,
  prependProps,
  deepMergeProps,
  matchPropsOn,
})

describe('merge variants', () => {
  it('appends at the root by default, as before', async () => {
    expect(labels(await resolveProps({ feed: merge(() => [1]) }, null))).toEqual({
      mergeProps: ['feed'],
      prependProps: [],
      deepMergeProps: [],
      matchPropsOn: [],
    })
  })

  it('prepends with prepend() or { prepend: true }', async () => {
    const a = await resolveProps({ feed: prepend(() => [1]) }, null)
    const b = await resolveProps({ feed: merge(() => [1], { prepend: true }) }, null)
    expect(labels(a)).toEqual(labels(b))
    expect(a.prependProps).toEqual(['feed'])
    expect(a.mergeProps).toEqual([])
  })

  it('deep-merges with deepMerge() or { deep: true }, which wins over append/prepend', async () => {
    const a = await resolveProps({ tree: deepMerge(() => ({})) }, null)
    const b = await resolveProps({ tree: merge(() => ({}), { deep: true, prepend: true }) }, null)
    expect(a.deepMergeProps).toEqual(['tree'])
    expect(labels(a)).toEqual(labels(b))
    expect(b.prependProps).toEqual([])
  })

  it('labels nested paths instead of the root when append/prepend paths are given', async () => {
    const { mergeProps, prependProps } = await resolveProps(
      { inbox: merge(() => ({ data: [], pinned: [] }), { append: ['data'], prepend: ['pinned'] }) },
      null,
    )
    expect(mergeProps).toEqual(['inbox.data'])
    expect(prependProps).toEqual(['inbox.pinned'])
  })

  it('emits matchPropsOn as <path>.<field>, for the root and for nested paths', async () => {
    const { matchPropsOn } = await resolveProps(
      {
        users: merge(() => [], { matchOn: 'id' }),
        inbox: merge(() => ({ data: [] }), { append: ['data'], matchOn: 'data.id' }),
        both: deepMerge(() => ({}), { matchOn: ['items.id', 'tags.slug'] }),
      },
      null,
    )
    expect(matchPropsOn).toEqual(['users.id', 'inbox.data.id', 'both.items.id', 'both.tags.slug'])
  })

  it('lets scroll() name its identifying field too', async () => {
    const { mergeProps, matchPropsOn } = await resolveProps(
      { contacts: scroll(() => ({ data: [], currentPage: 1 }), { matchOn: 'id' }) },
      partial(['contacts']),
    )
    expect(mergeProps).toEqual(['contacts.data'])
    expect(matchPropsOn).toEqual(['contacts.data.id'])
  })

  it('drops every label, matchPropsOn included, on X-Inertia-Reset', async () => {
    const result = await resolveProps(
      { users: merge(() => [1], { matchOn: 'id' }), tree: deepMerge(() => ({})) },
      partial(['users', 'tree']),
      { reset: ['users', 'tree'] },
    )
    expect(labels(result)).toEqual({ mergeProps: [], prependProps: [], deepMergeProps: [], matchPropsOn: [] })
    expect(result.props).toEqual({ users: [1], tree: {} })
  })

  it('works at any depth', async () => {
    const { prependProps, matchPropsOn } = await resolveProps(
      { chat: { messages: prepend(() => [], { matchOn: 'id' }) } },
      null,
    )
    expect(prependProps).toEqual(['chat.messages'])
    expect(matchPropsOn).toEqual(['chat.messages.id'])
  })
})

@Controller()
class FeedController {
  @Get('feed')
  @View('Feed')
  feed(@Query('tick') tick = '0') {
    const n = Number(tick)
    return {
      tick: n,
      newest: prepend(() => [{ id: n }], { matchOn: 'id' }),
      stats: deepMerge(() => ({ counts: { tick: n }, items: [{ id: n }] }), { matchOn: 'items.id' }),
    }
  }
}

describe('merge variants on the wire (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1' })],
      controllers: [FeedController],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('carries prependProps, deepMergeProps and matchPropsOn in the page object', async () => {
    const res = await request(app.getHttpServer())
      .get('/feed?tick=2')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')

    expect(res.body.prependProps).toEqual(['newest'])
    expect(res.body.deepMergeProps).toEqual(['stats'])
    expect(res.body.matchPropsOn).toEqual(['newest.id', 'stats.items.id'])
    expect(res.body.mergeProps).toBeUndefined()
  })

  it('omits them all after a reset', async () => {
    const res = await request(app.getHttpServer())
      .get('/feed?tick=0')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .set('X-Inertia-Partial-Component', 'Feed')
      .set('X-Inertia-Partial-Data', 'newest,stats')
      .set('X-Inertia-Reset', 'newest,stats')

    expect(res.body.prependProps).toBeUndefined()
    expect(res.body.deepMergeProps).toBeUndefined()
    expect(res.body.matchPropsOn).toBeUndefined()
    expect(res.body.props.newest).toEqual([{ id: 0 }])
  })
})
