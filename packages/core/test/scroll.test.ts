import { Controller, Get, Query, type INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { MvcModule, View, resolveProps, scroll, type ScrollPage } from '../src/index'

/** An offset paginator's second page of three. */
const page2: ScrollPage<{ id: number }> = {
  data: [{ id: 4 }, { id: 5 }, { id: 6 }],
  pageName: 'page',
  currentPage: 2,
  previousPage: 1,
  nextPage: 3,
  total: 9,
}

const partial = (only: string[]) => ({ only, except: [] })

describe('scroll() props', () => {
  it('labels the inner array for merging and emits the cursor under scrollProps', async () => {
    const { props, mergeProps, prependProps, scrollProps } = await resolveProps(
      { contacts: scroll(() => page2) },
      null,
    )

    // The whole page travels, extra fields included; the client reads `data`.
    expect(props.contacts).toEqual(page2)
    expect(mergeProps).toEqual(['contacts.data'])
    expect(prependProps).toEqual([])
    expect(scrollProps).toEqual({
      contacts: { pageName: 'page', previousPage: 1, nextPage: 3, currentPage: 2, reset: false },
    })
  })

  it('labels for prepending when the client asks for the previous page', async () => {
    const { mergeProps, prependProps } = await resolveProps(
      { contacts: scroll(() => page2) },
      partial(['contacts']),
      { mergeIntent: 'prepend' },
    )

    expect(prependProps).toEqual(['contacts.data'])
    expect(mergeProps).toEqual([])
  })

  it('drops the merge label and flags the cursor on X-Inertia-Reset', async () => {
    const { props, mergeProps, prependProps, scrollProps } = await resolveProps(
      { contacts: scroll(() => page2) },
      partial(['contacts']),
      { reset: ['contacts'] },
    )

    // The page still arrives, unlabelled, so the client replaces instead of merging.
    expect(props.contacts).toEqual(page2)
    expect(mergeProps).toEqual([])
    expect(prependProps).toEqual([])
    expect(scrollProps.contacts.reset).toBe(true)
  })

  it('defers the first page on request: announced, labelled, but no cursor yet', async () => {
    const closure = vi.fn(() => page2)
    const raw = () => ({ contacts: scroll(closure, { defer: true }) })

    const initial = await resolveProps(raw(), null)
    expect(closure).not.toHaveBeenCalled()
    expect(initial.props.contacts).toBeUndefined()
    expect(initial.deferredProps).toEqual({ default: ['contacts'] })
    expect(initial.mergeProps).toEqual(['contacts.data'])
    expect(initial.scrollProps).toEqual({})

    // The client's follow-up request resolves it like any deferred prop.
    const followUp = await resolveProps(raw(), partial(['contacts']))
    expect(closure).toHaveBeenCalledOnce()
    expect(followUp.props.contacts).toEqual(page2)
    expect(followUp.scrollProps.contacts.currentPage).toBe(2)
  })

  it('puts a deferred scroll prop in the requested group', async () => {
    const { deferredProps } = await resolveProps({ notes: scroll(() => page2, { defer: 'sidebar' }) }, null)
    expect(deferredProps).toEqual({ sidebar: ['notes'] })
  })

  it('uses dot paths at any depth, like every other piece of metadata', async () => {
    const { mergeProps, scrollProps } = await resolveProps(
      { organization: { name: 'Acme', contacts: scroll(() => page2) } },
      null,
    )

    expect(mergeProps).toEqual(['organization.contacts.data'])
    expect(Object.keys(scrollProps)).toEqual(['organization.contacts'])
  })

  it('never calls the closure on a partial reload for something else', async () => {
    const closure = vi.fn(() => page2)

    const { scrollProps } = await resolveProps({ contacts: scroll(closure), filters: {} }, partial(['filters']))

    expect(closure).not.toHaveBeenCalled()
    expect(scrollProps).toEqual({})
  })

  it('supports a custom wrapper key and string cursors', async () => {
    const { mergeProps, scrollProps } = await resolveProps(
      {
        feed: scroll(
          () => ({ items: [{ id: 'a' }], pageName: 'cursor', currentPage: 'c1', nextPage: 'c2' }),
          { wrapper: 'items' },
        ),
      },
      null,
    )

    expect(mergeProps).toEqual(['feed.items'])
    expect(scrollProps.feed).toEqual({
      pageName: 'cursor',
      previousPage: null,
      nextPage: 'c2',
      currentPage: 'c1',
      reset: false,
    })
  })

  it('reads the cursor through a metadata reader for foreign paginator shapes', async () => {
    const paginator = { data: [1, 2], meta: { current_page: 3, last_page: 5 } }

    const { scrollProps } = await resolveProps(
      {
        rows: scroll(() => paginator, {
          metadata: (p) => ({
            pageName: 'page',
            currentPage: p.meta.current_page,
            previousPage: p.meta.current_page - 1,
            nextPage: p.meta.current_page < p.meta.last_page ? p.meta.current_page + 1 : null,
          }),
        }),
      },
      null,
    )

    expect(scrollProps.rows).toMatchObject({ currentPage: 3, previousPage: 2, nextPage: 4 })
  })

  it('explains itself when the closure does not return a page', async () => {
    await expect(resolveProps({ contacts: scroll(() => [1, 2, 3] as never) }, null)).rejects.toThrow(
      /scroll\(\) prop "contacts" must resolve to an object with a "data" array/,
    )
  })
})

@Controller()
class ContactsController {
  @Get('contacts')
  @View('Contacts/Index')
  index(@Query('page') page = '1') {
    const current = Number(page)
    return {
      filters: { search: '' },
      contacts: scroll(() => ({
        data: [{ id: current * 10 }],
        currentPage: current,
        previousPage: current > 1 ? current - 1 : null,
        nextPage: current < 3 ? current + 1 : null,
      })),
    }
  }
}

describe('scroll() on the wire (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MvcModule.forRoot({ version: 'v1' })],
      controllers: [ContactsController],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  const visit = () =>
    request(app.getHttpServer())
      .get('/contacts?page=2')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .set('X-Inertia-Partial-Component', 'Contacts/Index')
      .set('X-Inertia-Partial-Data', 'contacts')

  it('appends by default', async () => {
    const res = await visit()

    expect(res.body.props.contacts.data).toEqual([{ id: 20 }])
    expect(res.body.mergeProps).toEqual(['contacts.data'])
    expect(res.body.prependProps).toBeUndefined()
    expect(res.body.scrollProps).toEqual({
      contacts: { pageName: 'page', previousPage: 1, nextPage: 3, currentPage: 2, reset: false },
    })
  })

  it('prepends when X-Inertia-Infinite-Scroll-Merge-Intent says so', async () => {
    const res = await visit().set('X-Inertia-Infinite-Scroll-Merge-Intent', 'prepend')

    expect(res.body.prependProps).toEqual(['contacts.data'])
    expect(res.body.mergeProps).toBeUndefined()
  })

  it('answers a reset with an unlabelled page and reset: true', async () => {
    const res = await visit().set('X-Inertia-Reset', 'contacts')

    expect(res.body.mergeProps).toBeUndefined()
    expect(res.body.prependProps).toBeUndefined()
    expect(res.body.scrollProps.contacts.reset).toBe(true)
  })

  it('omits scrollProps entirely when nothing scrolls', async () => {
    const res = await request(app.getHttpServer())
      .get('/contacts')
      .set('X-Inertia', 'true')
      .set('X-Inertia-Version', 'v1')
      .set('X-Inertia-Partial-Component', 'Contacts/Index')
      .set('X-Inertia-Partial-Data', 'filters')

    expect(res.body.scrollProps).toBeUndefined()
    expect(res.body.mergeProps).toBeUndefined()
  })
})
